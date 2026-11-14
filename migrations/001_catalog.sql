CREATE TABLE products (
  id uuid PRIMARY KEY,
  sku varchar(40) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  description varchar(1000) NOT NULL DEFAULT ''
);
CREATE TABLE production_processes (
  id uuid PRIMARY KEY,
  code varchar(40) NOT NULL UNIQUE,
  name varchar(120) NOT NULL
);
CREATE TABLE product_processes (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES production_processes(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position > 0),
  PRIMARY KEY (product_id, process_id),
  UNIQUE (product_id, position)
);
CREATE INDEX product_processes_process_idx ON product_processes(process_id);
