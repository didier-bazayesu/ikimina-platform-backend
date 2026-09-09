import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('CREATE TABLE _placeholder (id INT PRIMARY KEY);');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
 await  pgm.sql('DROP TABLE _placeholder;');
}
