-- DROP SCHEMA network;

CREATE SCHEMA network AUTHORIZATION dineshpandey;

-- DROP SEQUENCE network.images_id_seq;

CREATE SEQUENCE network.images_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE network.users_id_seq;

CREATE SEQUENCE network.users_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;-- network.person definition

-- Drop table

-- DROP TABLE network.person;

CREATE TABLE network.person (
	id int4 NOT NULL,
	personname varchar NULL,
	birthdate date NULL,
	fatherid int4 NULL,
	motherid int4 NULL,
	spouseid int4 NULL,
	gender varchar NULL,
	currentlocation varchar NULL,
	entityname varchar(50) NULL,
	placebirth varchar(50) NULL,
	nativeplace varchar(50) NULL,
	locationmatric varchar(50) NULL,
	date_birth varchar(50) NULL,
	worksat varchar(50) NULL,
	living varchar(50) NULL,
	yr_birth varchar(50) NULL,
	name_alias varchar(50) NULL,
	fb_id varchar(50) NULL,
	mail_id varchar(50) NULL,
	phone varchar(50) NULL,
	addedon timestamp DEFAULT now() NULL,
	addedby varchar NULL,
	profile_image_url varchar(255) NULL,
	profile_image_filename varchar(255) NULL,
	image_upload_date timestamp NULL,
	CONSTRAINT person_pk PRIMARY KEY (id)
);
CREATE INDEX person_currentlocation_idx ON network.person USING btree (currentlocation);

-- Table Triggers

create trigger person_delete_trigger before
delete
    on
    network.person for each row execute function person_delete_function();


-- network.places definition

-- Drop table

-- DROP TABLE network.places;

CREATE TABLE network.places (
	placeid uuid NOT NULL,
	placename varchar NULL,
	state varchar NULL,
	country varchar DEFAULT 'India'::character varying NULL,
	geolocation point NULL,
	CONSTRAINT places_pk PRIMARY KEY (placeid)
);


-- network.users definition

-- Drop table

-- DROP TABLE network.users;

CREATE TABLE network.users (
	id serial4 NOT NULL,
	email varchar(255) NOT NULL,
	password_hash text NULL,
	google_id text NULL,
	"name" varchar(255) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);


-- network.images definition

-- Drop table

-- DROP TABLE network.images;

CREATE TABLE network.images (
	id serial4 NOT NULL,
	person_id int4 NULL,
	filename varchar(255) NOT NULL,
	original_filename varchar(255) NULL,
	file_path varchar(500) NOT NULL,
	file_size int4 NOT NULL,
	mime_type varchar(50) NOT NULL,
	image_type varchar(20) DEFAULT 'profile'::character varying NULL,
	width int4 NULL,
	height int4 NULL,
	crop_data jsonb NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT images_pkey PRIMARY KEY (id),
	CONSTRAINT images_person_id_fkey FOREIGN KEY (person_id) REFERENCES network.person(id) ON DELETE CASCADE
);


-- network.marriages definition

-- Drop table

-- DROP TABLE network.marriages;

CREATE TABLE network.marriages (
	husbandid int4 NOT NULL,
	wifeid int4 NOT NULL,
	marriagedate date NULL,
	marriageyear int4 NULL,
	intercaste bool DEFAULT false NULL,
	addedon timestamp DEFAULT now() NULL,
	CONSTRAINT marriages_unique UNIQUE (husbandid, wifeid),
	CONSTRAINT marriages_husband_fk FOREIGN KEY (husbandid) REFERENCES network.person(id),
	CONSTRAINT marriages_wife_fk FOREIGN KEY (wifeid) REFERENCES network.person(id)
);


-- network.v_parentchild source

CREATE OR REPLACE VIEW network.v_parentchild
AS SELECT p.id,
    f.id AS fatherid,
    p.personname,
    f.personname AS fathername,
    m.id AS motherid,
    m.personname AS mothername
   FROM network.person p
     LEFT JOIN network.person f ON p.fatherid = f.id
     LEFT JOIN network.person m ON m.id = p.motherid;



-- DROP FUNCTION network.get_family(int4);

CREATE OR REPLACE FUNCTION network.get_family(person_id integer)
 RETURNS TABLE(personid character varying, personname character varying, fatherid character varying, motherid character varying, gender character varying, currentlocation character varying, nativeplace character varying, date_birth character varying, fb_id character varying, mail_id character varying, phone character varying, children_ids character varying[], spouse_ids character varying[])
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id::character varying,
        p.personname,
        p.fatherid::character varying,
        p.motherid::character varying,
		p.gender,
		p.currentlocation,
		p.nativeplace,
		p.date_birth,
		p.fb_id,
		p.mail_id,
		p.phone,
        (
            SELECT ARRAY_AGG(c.id::character varying)
            FROM network.person c
            WHERE c.fatherid = person_id OR c.motherid = person_id
        ) AS children_ids,
        (
            SELECT ARRAY_AGG(spouse_id::character varying)
            FROM (
                SELECT wifeid AS spouse_id FROM network.marriages WHERE husbandid = person_id
                UNION
                SELECT husbandid AS spouse_id FROM network.marriages WHERE wifeid = person_id
            ) m
        ) AS spouse_ids
    FROM network.person p
    WHERE p.id = person_id;
END;
$function$
;