exports.up = async (sql) => {
  await sql`
    CREATE TABLE sessions (
      id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
      token varchar(110) NOT NULL UNIQUE,
			expiry_timestamp timestamp NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
      csrf_seed VARCHAR,
			user_id integer REFERENCES users (id) ON DELETE CASCADE
    )
  `;
};

exports.down = async (sql) => {
  await sql`
    DROP TABLE sessions
  `;
};
