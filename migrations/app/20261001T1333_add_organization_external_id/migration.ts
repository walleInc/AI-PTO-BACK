#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/92459a42f19e3d2c4af385204bd49e22dd666c062cf9d7f7b37b34ffcd01d21b/contract';
import endContract from '../../snapshots/92459a42f19e3d2c4af385204bd49e22dd666c062cf9d7f7b37b34ffcd01d21b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/eb708c08fb89d52bdcdb299e39f561f04defc01139117bcda513e94f373e51eb/contract';
import startContract from '../../snapshots/eb708c08fb89d52bdcdb299e39f561f04defc01139117bcda513e94f373e51eb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'organization',
        column: col('externalId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'organization',
        constraint: 'organization_externalId_key',
        columns: ['externalId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
