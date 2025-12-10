#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ESPmDNS.h>
#include <Preferences.h>

#define SS 5
#define RST 12
#define DIO0 2

LiquidCrystal_I2C lcd(0x27, 16, 2);

// === Kredensial MQTT ===
char mqtt_broker[64];
char mqtt_port_str[6];
char mqtt_username[64];
char mqtt_password[64];
const char *topic = "aerialcast/telemetry";
// === Klien Global ===
WiFiClient espClient;
PubSubClient client(espClient);
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
Preferences prefs; // NVS storage for persistent config

// === Variabel Status Global ===
String global_mqtt_status = "Init...";
String global_lora_status = "Init...";
String global_last_packet = "{\"status\":\"Initializing...\"}";

// === Metrics & Runtime State ===
volatile uint32_t stat_total_packets = 0;
volatile uint32_t stat_json_errors = 0;
volatile uint32_t stat_mqtt_published = 0;
volatile uint32_t stat_mqtt_failed = 0;
volatile uint16_t stat_ws_clients = 0;
volatile int16_t last_rssi = 0;
volatile float last_snr = 0.0f;
volatile unsigned long last_packet_ms = 0;

// === Runtime configuration/cache ===
const char *mdns_hostname = "aerialcast";
int g_mqtt_port = 1883; // updated after WiFiManager

// === Persistent config helpers (ESP32 NVS) ===
void loadConfig()
{
  prefs.begin("gcs", true); // read-only
  String broker = prefs.getString("mqtt_broker", "");
  String port = prefs.getString("mqtt_port", "1883");
  String user = prefs.getString("mqtt_user", "");
  String pass = prefs.getString("mqtt_pass", "");
  prefs.end();
  broker.toCharArray(mqtt_broker, sizeof(mqtt_broker));
  port.toCharArray(mqtt_port_str, sizeof(mqtt_port_str));
  user.toCharArray(mqtt_username, sizeof(mqtt_username));
  pass.toCharArray(mqtt_password, sizeof(mqtt_password));
}

void saveConfig()
{
  prefs.begin("gcs", false); // read-write
  prefs.putString("mqtt_broker", String(mqtt_broker));
  prefs.putString("mqtt_port", String(mqtt_port_str));
  prefs.putString("mqtt_user", String(mqtt_username));
  prefs.putString("mqtt_pass", String(mqtt_password));
  prefs.end();
}

// =====================================================================
// === HTML Dashboard (moved to header to avoid Arduino preprocessor issues) ===
// =====================================================================
#include "index_html.h"

// =====================================================================
// === WebSocket Handler ===
// =====================================================================
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
{
  if (type == WS_EVT_CONNECT)
  {
    Serial.println("WebSocket client connected");
    stat_ws_clients++;
    client->text(global_last_packet); // Kirim data terakhir ke client baru
  }
  else if (type == WS_EVT_DISCONNECT)
  {
    Serial.println("WebSocket client disconnected");
    if (stat_ws_clients > 0) stat_ws_clients--;
  }
}

// =====================================================================
// === MQTT Handler ===
// =====================================================================
void callback(char *topic, byte *payload, unsigned int length)
{
}

void reconnectMQTT()
{
  while (!client.connected())
  {
    Serial.print("Attempting MQTT connection...");
    global_mqtt_status = "Connecting...";
    lcd.setCursor(0, 0);
    lcd.print("MQTT: Connecting");

    String clientId = "AerialCast-GCS-";
    clientId += String(random(0xffff), HEX);
    
    bool has_credentials = (strlen(mqtt_username) > 0);
    bool connect_success = false; 

    if (has_credentials)
    {
      Serial.println("Connecting with MQTT credentials...");
      connect_success = client.connect(clientId.c_str(), mqtt_username, mqtt_password);
    }
    else
    {
      Serial.println("Connecting as anonymous...");
      connect_success = client.connect(clientId.c_str());
    }

    if (connect_success)
    {
      Serial.println("connected");
      global_mqtt_status = "Connected";
      lcd.setCursor(0, 0);
      lcd.print("MQTT: Connected  ");
    }
    else
    {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");

      global_mqtt_status = "FAILED";
      lcd.setCursor(0, 0);
      lcd.print("MQTT: FAILED    ");
      delay(5000);
    }
  }
}

// //Dummy Data (test purposes)
void sendDummyPacket()
{
  StaticJsonDocument<200> doc;
  doc["lora_id"] = "GCS_DUMMY_TEST";
  doc["lat"] = -6.8000 + (random(-100, 100) / 10000.0);
  doc["lon"] = 107.6000 + (random(-100, 100) / 10000.0);
  doc["alt"] = 150;
  doc["vbat"] = 12.0 - (random(0, 50) / 100.0);

  String dummyPacket;
  serializeJson(doc, dummyPacket);

  global_last_packet = dummyPacket; 

  Serial.println("--- [SENDING DUMMY PACKET] ---");
  Serial.println(dummyPacket);

  // 1. Publish MQTT
  if (client.publish(topic, dummyPacket.c_str()))
  {
    Serial.println("MQTT: Dummy Packet Published!");
  }
  else
  {
    Serial.println("MQTT: Dummy Publish FAILED");
  }

  // 2. Broadcast WebSocket
  ws.textAll(global_last_packet);
  Serial.println("WebSocket: Dummy Packet Broadcasted!");
  Serial.println("---------------------------------");
}

// Setup
void setup()
{
  Serial.begin(115200);
  lcd.init();
  lcd.backlight();

  // Splash Screen
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("AerialCast GCS");
  lcd.setCursor(0, 1);
  lcd.print("System");
  delay(5000);
  while (!Serial)
    ;

  // WiFiManager Setup
  WiFi.mode(WIFI_STA);
  WiFiManager wm;
  wm.setConnectTimeout(60);

  // Load stored MQTT config
  loadConfig();

  WiFiManagerParameter custom_mqtt_broker("broker", "MQTT Broker Host", strlen(mqtt_broker)?mqtt_broker:"", 64);
  WiFiManagerParameter custom_mqtt_port("port", "MQTT Port", strlen(mqtt_port_str)?mqtt_port_str:"1883", 6);
  WiFiManagerParameter custom_mqtt_user("user", "MQTT Username", strlen(mqtt_username)?mqtt_username:"", 64);
  WiFiManagerParameter custom_mqtt_pass("pass", "MQTT Password", strlen(mqtt_password)?mqtt_password:"", 64);

  wm.addParameter(&custom_mqtt_broker);
  wm.addParameter(&custom_mqtt_port);
  wm.addParameter(&custom_mqtt_user);
  wm.addParameter(&custom_mqtt_pass);

  wm.setSaveParamsCallback([&]() {
    strcpy(mqtt_broker, custom_mqtt_broker.getValue());
    strcpy(mqtt_port_str, custom_mqtt_port.getValue());
    strcpy(mqtt_username, custom_mqtt_user.getValue());
    strcpy(mqtt_password, custom_mqtt_pass.getValue());
    saveConfig();
  });

  lcd.clear();
  lcd.print("Connect to AP:");
  lcd.setCursor(0, 1);
  lcd.print("AerialCast-GCS");

  if (!wm.autoConnect("AerialCast-AP"))
  {
    Serial.println("Failed to connect and hit timeout");
    lcd.clear();
    lcd.print("Setup FAILED.");
    delay(3000);
    ESP.restart();
  }

  Serial.println("Connected to the WiFi network!");

  strcpy(mqtt_broker, custom_mqtt_broker.getValue());
  strcpy(mqtt_port_str, custom_mqtt_port.getValue());
  strcpy(mqtt_username, custom_mqtt_user.getValue());
  strcpy(mqtt_password, custom_mqtt_pass.getValue());
  saveConfig();

  int mqtt_port = atoi(mqtt_port_str);
  // keep global port in sync for /status reporting
  g_mqtt_port = mqtt_port;

  Serial.println("Using MQTT Config from WiFiManager:");
  Serial.println(mqtt_broker);
  Serial.println(mqtt_port);
  Serial.println(mqtt_username);

  lcd.clear();
  lcd.print("IP: ");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(8000);

  // =====================================================================
  // === mDNS Setup ===
  // =====================================================================
  if (!MDNS.begin(mdns_hostname))
  {
    Serial.println("Error setting up MDNS responder!");
    lcd.clear();
    lcd.print("mDNS FAILED");
    delay(2000);
  }
  else
  {
    Serial.println("mDNS responder started");
    MDNS.addService("http", "tcp", 80);
  }

  // MQTT Setup
  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback);

  // LoRa Setup
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("MQTT: ...");
  lcd.setCursor(0, 1);
  lcd.print("LoRa: Init...");
  global_lora_status = "Init...";

  LoRa.setPins(SS, RST, DIO0);
  if (!LoRa.begin(433E6))
  {
    Serial.println("Starting LoRa failed!");
    global_lora_status = "FAILED!";
    lcd.setCursor(0, 1);
    lcd.print("LoRa: FAILED!");
    while (1)
      ;
  }

  LoRa.receive();
  Serial.println("LoRa Init OK! Waiting for telemetry packets...");
  global_lora_status = "Listening";
  lcd.setCursor(0, 1);
  lcd.print("LoRa: Listening   ");

  // Setup Web Server & WebSocket
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request)
            { request->send_P(200, "text/html", index_html); });

  // Status endpoint
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    StaticJsonDocument<768> doc;
    doc["wifi_ssid"] = WiFi.SSID();
    doc["ip"] = WiFi.localIP().toString();
    doc["mdns"] = mdns_hostname;
    doc["mqtt_status"] = global_mqtt_status;
    doc["lora_status"] = global_lora_status;
    doc["mqtt_broker"] = mqtt_broker;
    doc["mqtt_port"] = g_mqtt_port;
    doc["mqtt_topic"] = topic;
    doc["ws_clients"] = stat_ws_clients;
    doc["total_packets"] = stat_total_packets;
    doc["json_errors"] = stat_json_errors;
    doc["mqtt_published"] = stat_mqtt_published;
    doc["mqtt_failed"] = stat_mqtt_failed;
    doc["last_rssi"] = last_rssi;
    doc["last_snr"] = last_snr;
    doc["uptime_ms"] = millis();
    long age = (last_packet_ms == 0) ? -1 : (long)(millis() - last_packet_ms);
    doc["last_packet_age_ms"] = age;
    String out; serializeJson(doc, out);
    request->send(200, "application/json", out);
  });

  server.begin();
  Serial.println("HTTP server started. Open IP in browser.");
}

void loop()
{
  // MQTT connection loop
  if (!client.connected())
  {
    reconnectMQTT();
  }
  client.loop();
  ws.cleanupClients();

  // =====================================================================
  // ===  DUMMY (Testing Purposes) ===
  // =====================================================================

  // sendDummyPacket();
  // delay(2000);

  // =====================================================================

  // LoRa Packet
  int packetSize = LoRa.parsePacket();

  if (packetSize)
  {
    stat_total_packets++;
    last_rssi = LoRa.packetRssi();
    last_snr = LoRa.packetSnr();
    String rssiString = "LoRa : " + String(last_rssi) + "dBm  ";
    global_lora_status = String(last_rssi) + "dBm";
    lcd.setCursor(0, 1);
    lcd.print(rssiString);

    String receivedString = "";
    while (LoRa.available())
    {
      receivedString += (char)LoRa.read();
    }

  global_last_packet = receivedString; 
  last_packet_ms = millis();

    Serial.println("---");
    Serial.print("Received: '");
    Serial.print(receivedString);
    Serial.print("' with RSSI: ");
    Serial.println(LoRa.packetRssi());

    // Parsing JSON
  StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, receivedString);

    if (error)
    {
      Serial.print("JSON parse failed: ");
      Serial.println(error.c_str());
      global_lora_status = "JSON FAILED";
      stat_json_errors++;
      global_last_packet = "{\"error\":\"JSON parse failed\"}";
      lcd.setCursor(0, 1);
      lcd.print("LoRa: JSON FAILED");
    }
    else
    {
      Serial.println("JSON Parsed OK");

      // Enrich payload with radio link diagnostics before publishing
      doc["rssi"] = last_rssi;
      doc["snr"] = last_snr;

      String enrichedPacket;
      serializeJson(doc, enrichedPacket);
      global_last_packet = enrichedPacket;

      // Publish data MQTT
      if (client.publish(topic, enrichedPacket.c_str()))
      {
        Serial.println("MQTT: Packet Published!");
        stat_mqtt_published++;
      }
      else
      {
        Serial.println("MQTT: Publish FAILED");
        stat_mqtt_failed++;
        global_mqtt_status = "Pub FAILED";
        lcd.setCursor(0, 0);
        lcd.print("MQTT: Pub FAILED");
      }
    }

    // Broadcast WebSocket
  ws.textAll(global_last_packet);
    delay(500);
    global_lora_status = "Listening";
    lcd.setCursor(0, 1);
    lcd.print("LoRa : Listening   ");
  }
}
