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

// === Variabel Status Global ===
String global_mqtt_status = "Init...";
String global_lora_status = "Init...";
String global_last_packet = "{\"status\":\"Initializing...\"}";

// =====================================================================
// === HTML Dashboard ===
// =====================================================================
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML><html>
<head>
  <title>AerialCast GCS Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; background: #121212; color: #E0E0E0; }
    h2 { color: #BB86FC; }
    .card { background: #1E1E1E; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.5); margin-bottom: 20px; }
    #log { background: #000; padding: 10px; border-radius: 4px; height: 300px; overflow-y: scroll; font-family: 'Courier New', monospace; }
    #status { background: #333; padding: 10px; border-radius: 4px; }
    pre { margin: 0; word-wrap: break-word; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h2>AerialCast GCS Dashboard</h2>
  <div class="card">
    <h3>Live Status</h3>
    <div id="status">
      <p><strong>MQTT:</strong> <span id="mqtt_status">Connecting...</span></p>
      <p><strong>LoRa:</strong> <span id="lora_status">Listening...</span></p>
    </div>
  </div>
  <div class="card">
    <h3>Live Telemetry Log</h3>
    <div id="log"></div>
  </div>
<script>
  var gateway = `ws://${window.location.hostname}/ws`;
  var websocket;
  window.addEventListener('load', onLoad);
  function initWebSocket() {
    websocket = new WebSocket(gateway);
    websocket.onopen    = onOpen;
    websocket.onclose   = onClose;
    websocket.onmessage = onMessage;
  }
  function onOpen(event) {
    document.getElementById('mqtt_status').innerHTML = "Connected to GCS";
  }
  function onClose(event) {
    document.getElementById('mqtt_status').innerHTML = "Disconnected from GCS";
    setTimeout(initWebSocket, 2000);
  }
  function onMessage(event) {
    var logDiv = document.getElementById('log');
    var p = document.createElement('pre');
    p.innerHTML = event.data;
    logDiv.appendChild(p);
    logDiv.scrollTop = logDiv.scrollHeight;
    try {
      var data = JSON.parse(event.data);
      if (data.lora_id) {
        document.getElementById('lora_status').innerHTML = `Received packet (ID: ${data.lora_id})`;
      }
      if (data.error) {
         document.getElementById('lora_status').innerHTML = `<span style="color:red;">${data.error}</span>`;
      }
    } catch(e) {}
  }
  function onLoad(event) {
    initWebSocket();
  }
</script>
</body>
</html>
)rawliteral";

// =====================================================================
// === WebSocket Handler ===
// =====================================================================
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
{
  if (type == WS_EVT_CONNECT)
  {
    Serial.println("WebSocket client connected");
    client->text(global_last_packet); // Kirim data terakhir ke client baru
  }
  else if (type == WS_EVT_DISCONNECT)
  {
    Serial.println("WebSocket client disconnected");
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

  WiFiManagerParameter custom_mqtt_broker("broker", "MQTT Broker Host", mqtt_broker, 64);
  WiFiManagerParameter custom_mqtt_port("port", "MQTT Port", "1883", 6);
  WiFiManagerParameter custom_mqtt_user("user", "MQTT Username", mqtt_username, 64);
  WiFiManagerParameter custom_mqtt_pass("pass", "MQTT Password", mqtt_password, 64);

  wm.addParameter(&custom_mqtt_broker);
  wm.addParameter(&custom_mqtt_port);
  wm.addParameter(&custom_mqtt_user);
  wm.addParameter(&custom_mqtt_pass);

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

  int mqtt_port = atoi(mqtt_port_str);

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
  if (!MDNS.begin("aerialcast"))
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
    String rssiString = "LoRa : " + String(LoRa.packetRssi()) + "dBm  ";
    global_lora_status = String(LoRa.packetRssi()) + "dBm";
    lcd.setCursor(0, 1);
    lcd.print(rssiString);

    String receivedString = "";
    while (LoRa.available())
    {
      receivedString += (char)LoRa.read();
    }

    global_last_packet = receivedString;

    Serial.println("---");
    Serial.print("Received: '");
    Serial.print(receivedString);
    Serial.print("' with RSSI: ");
    Serial.println(LoRa.packetRssi());

    // Parsing JSON
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, receivedString);

    if (error)
    {
      Serial.print("JSON parse failed: ");
      Serial.println(error.c_str());
      global_lora_status = "JSON FAILED";
      global_last_packet = "{\"error\":\"JSON parse failed\"}";
      lcd.setCursor(0, 1);
      lcd.print("LoRa: JSON FAILED");
    }
    else
    {
      Serial.println("JSON Parsed OK");

      // Publish data MQTT
      if (client.publish(topic, receivedString.c_str()))
      {
        Serial.println("MQTT: Packet Published!");
      }
      else
      {
        Serial.println("MQTT: Publish FAILED");
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
