--
-- PostgreSQL database dump
--

\restrict TmeYMmUYqCTW3lvy0gRdu7awawNzaL1zHigcdWIlHeKXmHR3mi4GwZois99jLbN

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: timescaledb; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS timescaledb WITH SCHEMA public;


--
-- Name: EXTENSION timescaledb; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION timescaledb IS 'Enables scalable inserts and complex queries for time-series data (Community Edition)';


--
-- Name: alerttype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alerttype AS ENUM (
    'LOW_BATTERY',
    'GEOFENCE_BREACH',
    'SIGNAL_LOST',
    'MISSION_ERROR'
);


--
-- Name: checklisttype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.checklisttype AS ENUM (
    'PRE_FLIGHT',
    'POST_FLIGHT'
);


--
-- Name: dronestatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dronestatus AS ENUM (
    'READY',
    'MAINTENANCE',
    'FLYING',
    'RETIRED'
);


--
-- Name: geofencetype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.geofencetype AS ENUM (
    'SAFE_ZONE',
    'NO_FLY_ZONE'
);


--
-- Name: missionstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.missionstatus AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELED'
);


--
-- Name: sessionstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sessionstatus AS ENUM (
    'LIVE',
    'COMPLETED',
    'FAILED'
);


--
-- Name: userrole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.userrole AS ENUM (
    'ADMIN',
    'PILOT'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    alert_id uuid NOT NULL,
    session_id uuid,
    alert_type public.alerttype NOT NULL,
    message text,
    "timestamp" timestamp with time zone NOT NULL
);


--
-- Name: checklist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_items (
    item_id uuid NOT NULL,
    checklist_id uuid NOT NULL,
    item_text character varying(255) NOT NULL,
    "order" smallint NOT NULL
);


--
-- Name: checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklists (
    checklist_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    type public.checklisttype NOT NULL
);


--
-- Name: drones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drones (
    drone_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    model character varying(255),
    lora_id character varying(100) NOT NULL,
    status public.dronestatus NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: flight_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flight_sessions (
    session_id uuid NOT NULL,
    mission_id uuid,
    drone_id uuid NOT NULL,
    pilot_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    status public.sessionstatus NOT NULL
);


--
-- Name: geofence_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geofence_points (
    point_id uuid NOT NULL,
    geofence_id uuid NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    "order" smallint NOT NULL
);


--
-- Name: geofences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geofences (
    geofence_id uuid NOT NULL,
    area_name character varying(255) NOT NULL,
    type public.geofencetype NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: maintenance_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_logs (
    log_id uuid NOT NULL,
    drone_id uuid NOT NULL,
    serviced_by_user_id uuid,
    log_date date NOT NULL,
    notes text NOT NULL
);


--
-- Name: mission_checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mission_checklists (
    mission_id uuid NOT NULL,
    checklist_id uuid NOT NULL
);


--
-- Name: mission_geofences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mission_geofences (
    mission_id uuid NOT NULL,
    geofence_id uuid NOT NULL
);


--
-- Name: mission_waypoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mission_waypoints (
    waypoint_id uuid NOT NULL,
    mission_id uuid NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    altitude double precision,
    "order" smallint NOT NULL
);


--
-- Name: missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.missions (
    mission_id uuid NOT NULL,
    created_by_user_id uuid NOT NULL,
    mission_name character varying(255) NOT NULL,
    status public.missionstatus NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL,
    drone_id uuid NOT NULL
);


--
-- Name: telemetry_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telemetry_data (
    "time" timestamp with time zone NOT NULL,
    session_id uuid NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    altitude double precision,
    battery_voltage double precision,
    rssi integer
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role public.userrole NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Data for Name: hypertable; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.hypertable (id, schema_name, table_name, associated_schema_name, associated_table_prefix, num_dimensions, chunk_sizing_func_schema, chunk_sizing_func_name, chunk_target_size, compression_state, compressed_hypertable_id, status) FROM stdin;
1	public	telemetry_data	_timescaledb_internal	_hyper_1	1	_timescaledb_functions	calculate_chunk_interval	0	0	\N	0
\.


--
-- Data for Name: chunk; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.chunk (id, hypertable_id, schema_name, table_name, compressed_chunk_id, dropped, status, osm_chunk, creation_time) FROM stdin;
\.


--
-- Data for Name: chunk_column_stats; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.chunk_column_stats (id, hypertable_id, chunk_id, column_name, range_start, range_end, valid) FROM stdin;
\.


--
-- Data for Name: dimension; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.dimension (id, hypertable_id, column_name, column_type, aligned, num_slices, partitioning_func_schema, partitioning_func, interval_length, compress_interval_length, integer_now_func_schema, integer_now_func) FROM stdin;
1	1	time	timestamp with time zone	t	\N	\N	\N	604800000000	\N	\N	\N
\.


--
-- Data for Name: dimension_slice; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.dimension_slice (id, dimension_id, range_start, range_end) FROM stdin;
\.


--
-- Data for Name: chunk_constraint; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.chunk_constraint (chunk_id, dimension_slice_id, constraint_name, hypertable_constraint_name) FROM stdin;
\.


--
-- Data for Name: compression_chunk_size; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.compression_chunk_size (chunk_id, compressed_chunk_id, uncompressed_heap_size, uncompressed_toast_size, uncompressed_index_size, compressed_heap_size, compressed_toast_size, compressed_index_size, numrows_pre_compression, numrows_post_compression, numrows_frozen_immediately) FROM stdin;
\.


--
-- Data for Name: compression_settings; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.compression_settings (relid, compress_relid, segmentby, orderby, orderby_desc, orderby_nullsfirst, index) FROM stdin;
\.


--
-- Data for Name: continuous_agg; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.continuous_agg (mat_hypertable_id, raw_hypertable_id, parent_mat_hypertable_id, user_view_schema, user_view_name, partial_view_schema, partial_view_name, direct_view_schema, direct_view_name, materialized_only, finalized) FROM stdin;
\.


--
-- Data for Name: continuous_agg_migrate_plan; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.continuous_agg_migrate_plan (mat_hypertable_id, start_ts, end_ts, user_view_definition) FROM stdin;
\.


--
-- Data for Name: continuous_agg_migrate_plan_step; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.continuous_agg_migrate_plan_step (mat_hypertable_id, step_id, status, start_ts, end_ts, type, config) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_bucket_function; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.continuous_aggs_bucket_function (mat_hypertable_id, bucket_func, bucket_width, bucket_origin, bucket_offset, bucket_timezone, bucket_fixed_width) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_hypertable_invalidation_log; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.continuous_aggs_hypertable_invalidation_log (hypertable_id, lowest_modified_value, greatest_modified_value) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_invalidation_threshold; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.continuous_aggs_invalidation_threshold (hypertable_id, watermark) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_materialization_invalidation_log; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.continuous_aggs_materialization_invalidation_log (materialization_id, lowest_modified_value, greatest_modified_value) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_materialization_ranges; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.continuous_aggs_materialization_ranges (materialization_id, lowest_modified_value, greatest_modified_value) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_watermark; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.continuous_aggs_watermark (mat_hypertable_id, watermark) FROM stdin;
\.


--
-- Data for Name: metadata; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.metadata (key, value, include_in_telemetry) FROM stdin;
install_timestamp	2025-11-19 17:22:12.824388+07	t
timescaledb_version	2.23.1	f
exported_uuid	35b3c76f-9716-44ed-be47-5be5d75aee59	t
\.


--
-- Data for Name: tablespace; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: -
--

COPY _timescaledb_catalog.tablespace (id, hypertable_id, tablespace_name) FROM stdin;
\.


--
-- Data for Name: bgw_job; Type: TABLE DATA; Schema: _timescaledb_config; Owner: -
--

COPY _timescaledb_config.bgw_job (id, application_name, schedule_interval, max_runtime, max_retries, retry_period, proc_schema, proc_name, owner, scheduled, fixed_schedule, initial_start, hypertable_id, config, check_schema, check_name, timezone) FROM stdin;
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
a0d89278edaf
\.


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alerts (alert_id, session_id, alert_type, message, "timestamp") FROM stdin;
\.


--
-- Data for Name: checklist_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.checklist_items (item_id, checklist_id, item_text, "order") FROM stdin;
\.


--
-- Data for Name: checklists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.checklists (checklist_id, title, type) FROM stdin;
\.


--
-- Data for Name: drones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.drones (drone_id, name, model, lora_id, status, created_at) FROM stdin;
a329f865-e629-4dd8-bcf1-316e2c50dd7a	Drone Test	F450	GCS_DUMMY_TEST	READY	2025-11-24 06:45:43.058283+07
a813a34a-0152-41ad-9355-c67716aad082	Alpha	QuadX	DRONE-881	READY	2025-11-25 11:08:49.033536+07
\.


--
-- Data for Name: flight_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flight_sessions (session_id, mission_id, drone_id, pilot_id, start_time, end_time, status) FROM stdin;
\.


--
-- Data for Name: geofence_points; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.geofence_points (point_id, geofence_id, latitude, longitude, "order") FROM stdin;
778c61c3-6012-4363-b59a-d9acd3462c70	7f29acef-b038-4ddc-8f16-f8b9530add8b	-6.82	107.52	0
448dce44-cd8c-495b-ab77-fc0788fcd753	7f29acef-b038-4ddc-8f16-f8b9530add8b	-6.1	107.22	1
6617d850-ecc3-4ec6-8814-840039fd4e79	7f29acef-b038-4ddc-8f16-f8b9530add8b	-6.54	107.42	2
\.


--
-- Data for Name: geofences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.geofences (geofence_id, area_name, type, created_at) FROM stdin;
7f29acef-b038-4ddc-8f16-f8b9530add8b	Campus Area	NO_FLY_ZONE	2025-11-26 05:31:25.196623+07
\.


--
-- Data for Name: maintenance_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maintenance_logs (log_id, drone_id, serviced_by_user_id, log_date, notes) FROM stdin;
9e6a4bac-1f50-4373-833f-27c9405b1e6b	a329f865-e629-4dd8-bcf1-316e2c50dd7a	1e0f3af2-c01d-4e71-840d-0ff6c7fdf60c	2025-11-25	Perbaikan Sayap atas
\.


--
-- Data for Name: mission_checklists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mission_checklists (mission_id, checklist_id) FROM stdin;
\.


--
-- Data for Name: mission_geofences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mission_geofences (mission_id, geofence_id) FROM stdin;
\.


--
-- Data for Name: mission_waypoints; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mission_waypoints (waypoint_id, mission_id, latitude, longitude, altitude, "order") FROM stdin;
fd394a4b-ee59-4951-8288-7c424520e741	b84bb106-5298-4f3f-a21f-be99d59c7efa	-6.81	107.51	100	1
a4a119e3-ca02-4539-96e5-5805a65c8be7	b84bb106-5298-4f3f-a21f-be99d59c7efa	-6.82	107.52	120	2
96d3a5fe-e5e7-4d79-a5bc-ec6ed857b20e	b84bb106-5298-4f3f-a21f-be99d59c7efa	-6.83	107.53	121	3
0e95eedb-7df7-4500-8478-2801ed758ac4	c818bc11-a874-4690-8b56-cced2bb54e8b	-6.201	106.799	15	1
81b8beef-71f2-4d53-ac6d-98ed69b87231	c818bc11-a874-4690-8b56-cced2bb54e8b	-6.202	106.8	15	2
\.


--
-- Data for Name: missions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.missions (mission_id, created_by_user_id, mission_name, status, notes, created_at, drone_id) FROM stdin;
b84bb106-5298-4f3f-a21f-be99d59c7efa	1e0f3af2-c01d-4e71-840d-0ff6c7fdf60c	Patroli Kertawangi Sektor 1	DRAFT	Terbang rendah, awas pohon	2025-11-24 17:44:41.214575+07	a329f865-e629-4dd8-bcf1-316e2c50dd7a
c818bc11-a874-4690-8b56-cced2bb54e8b	1e0f3af2-c01d-4e71-840d-0ff6c7fdf60c	Survey Field A	DRAFT	Early morning pass	2025-11-25 11:14:23.165232+07	a813a34a-0152-41ad-9355-c67716aad082
\.


--
-- Data for Name: telemetry_data; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.telemetry_data ("time", session_id, latitude, longitude, altitude, battery_voltage, rssi) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (user_id, email, password_hash, full_name, role, created_at) FROM stdin;
1e0f3af2-c01d-4e71-840d-0ff6c7fdf60c	octa@test.com	$pbkdf2-sha256$29000$3xvDGINwbu19j9EagxCCMA$mXkxWASFk7ZUd2qr0CUZGwiiDQSHxzuIAwXvNVVEJ6U	OctaPilot	PILOT	2025-11-20 15:57:11.047193+07
6f6d6696-bf3f-488d-882f-269b56316e69	cek@example.com	$pbkdf2-sha256$29000$GcOY03pvDSGEMOacM4ZQ6g$XJabczSZkJrrno/lJjr1smAJu74Hi0MRS/L0ho/u22w	Cek Pilot	ADMIN	2025-11-20 16:26:59.24768+07
9dbc510e-28ab-4c38-ac9d-469b18bbcb3f	user@example.com	$pbkdf2-sha256$29000$4BwDwFjr3ZtzjhECYAxhTA$HS8GtDGbBKFwO6ctvyrDiyOTEW5BU60JcvQKuAuqt6w	string	PILOT	2025-11-26 05:27:34.412845+07
\.


--
-- Name: chunk_column_stats_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: -
--

SELECT pg_catalog.setval('_timescaledb_catalog.chunk_column_stats_id_seq', 1, false);


--
-- Name: chunk_constraint_name; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: -
--

SELECT pg_catalog.setval('_timescaledb_catalog.chunk_constraint_name', 1, false);


--
-- Name: chunk_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: -
--

SELECT pg_catalog.setval('_timescaledb_catalog.chunk_id_seq', 1, false);


--
-- Name: continuous_agg_migrate_plan_step_step_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: -
--

SELECT pg_catalog.setval('_timescaledb_catalog.continuous_agg_migrate_plan_step_step_id_seq', 1, false);


--
-- Name: dimension_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: -
--

SELECT pg_catalog.setval('_timescaledb_catalog.dimension_id_seq', 1, true);


--
-- Name: dimension_slice_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: -
--

SELECT pg_catalog.setval('_timescaledb_catalog.dimension_slice_id_seq', 1, false);


--
-- Name: hypertable_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: -
--

SELECT pg_catalog.setval('_timescaledb_catalog.hypertable_id_seq', 1, true);


--
-- Name: bgw_job_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_config; Owner: -
--

SELECT pg_catalog.setval('_timescaledb_config.bgw_job_id_seq', 1000, false);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (alert_id);


--
-- Name: checklist_items checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_items
    ADD CONSTRAINT checklist_items_pkey PRIMARY KEY (item_id);


--
-- Name: checklists checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_pkey PRIMARY KEY (checklist_id);


--
-- Name: drones drones_lora_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drones
    ADD CONSTRAINT drones_lora_id_key UNIQUE (lora_id);


--
-- Name: drones drones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drones
    ADD CONSTRAINT drones_pkey PRIMARY KEY (drone_id);


--
-- Name: flight_sessions flight_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_sessions
    ADD CONSTRAINT flight_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: geofence_points geofence_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geofence_points
    ADD CONSTRAINT geofence_points_pkey PRIMARY KEY (point_id);


--
-- Name: geofences geofences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geofences
    ADD CONSTRAINT geofences_pkey PRIMARY KEY (geofence_id);


--
-- Name: maintenance_logs maintenance_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_pkey PRIMARY KEY (log_id);


--
-- Name: mission_checklists mission_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_checklists
    ADD CONSTRAINT mission_checklists_pkey PRIMARY KEY (mission_id, checklist_id);


--
-- Name: mission_geofences mission_geofences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_geofences
    ADD CONSTRAINT mission_geofences_pkey PRIMARY KEY (mission_id, geofence_id);


--
-- Name: mission_waypoints mission_waypoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_waypoints
    ADD CONSTRAINT mission_waypoints_pkey PRIMARY KEY (waypoint_id);


--
-- Name: missions missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_pkey PRIMARY KEY (mission_id);


--
-- Name: telemetry_data telemetry_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telemetry_data
    ADD CONSTRAINT telemetry_data_pkey PRIMARY KEY ("time", session_id);


--
-- Name: mission_waypoints uq_mission_waypoint_order_per_mission; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_waypoints
    ADD CONSTRAINT uq_mission_waypoint_order_per_mission UNIQUE (mission_id, "order");


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: alerts alerts_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.flight_sessions(session_id);


--
-- Name: checklist_items checklist_items_checklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_items
    ADD CONSTRAINT checklist_items_checklist_id_fkey FOREIGN KEY (checklist_id) REFERENCES public.checklists(checklist_id);


--
-- Name: flight_sessions flight_sessions_drone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_sessions
    ADD CONSTRAINT flight_sessions_drone_id_fkey FOREIGN KEY (drone_id) REFERENCES public.drones(drone_id);


--
-- Name: flight_sessions flight_sessions_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_sessions
    ADD CONSTRAINT flight_sessions_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(mission_id);


--
-- Name: flight_sessions flight_sessions_pilot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_sessions
    ADD CONSTRAINT flight_sessions_pilot_id_fkey FOREIGN KEY (pilot_id) REFERENCES public.users(user_id);


--
-- Name: geofence_points geofence_points_geofence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geofence_points
    ADD CONSTRAINT geofence_points_geofence_id_fkey FOREIGN KEY (geofence_id) REFERENCES public.geofences(geofence_id);


--
-- Name: maintenance_logs maintenance_logs_drone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_drone_id_fkey FOREIGN KEY (drone_id) REFERENCES public.drones(drone_id);


--
-- Name: maintenance_logs maintenance_logs_serviced_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_serviced_by_user_id_fkey FOREIGN KEY (serviced_by_user_id) REFERENCES public.users(user_id);


--
-- Name: mission_checklists mission_checklists_checklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_checklists
    ADD CONSTRAINT mission_checklists_checklist_id_fkey FOREIGN KEY (checklist_id) REFERENCES public.checklists(checklist_id);


--
-- Name: mission_checklists mission_checklists_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_checklists
    ADD CONSTRAINT mission_checklists_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(mission_id);


--
-- Name: mission_geofences mission_geofences_geofence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_geofences
    ADD CONSTRAINT mission_geofences_geofence_id_fkey FOREIGN KEY (geofence_id) REFERENCES public.geofences(geofence_id);


--
-- Name: mission_geofences mission_geofences_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_geofences
    ADD CONSTRAINT mission_geofences_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(mission_id);


--
-- Name: mission_waypoints mission_waypoints_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_waypoints
    ADD CONSTRAINT mission_waypoints_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(mission_id);


--
-- Name: missions missions_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id);


--
-- Name: missions missions_drone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_drone_id_fkey FOREIGN KEY (drone_id) REFERENCES public.drones(drone_id);


--
-- Name: telemetry_data telemetry_data_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telemetry_data
    ADD CONSTRAINT telemetry_data_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.flight_sessions(session_id);


--
-- PostgreSQL database dump complete
--

\unrestrict TmeYMmUYqCTW3lvy0gRdu7awawNzaL1zHigcdWIlHeKXmHR3mi4GwZois99jLbN

