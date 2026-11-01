import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  ZONA_JUEGO,
  fechaMadrid,
  medianocheMadrid,
  msHastaMedianocheMadrid,
  sumarDias,
  formatearCuentaAtras
} from '../js/diario.js';

const d = (iso) => new Date(iso);
const t = (iso) => Date.parse(iso);

// Resultados de 338 a 341 como texto; se ejecuta en procesos hijos con otra TZ y se comparan byte a byte.
function informe() {
  const lineas = [];
  const instantes = [
    '2026-11-01T22:59:59.999Z', '2026-11-01T23:00:00Z', '2027-06-30T21:59:59Z', '2027-06-30T22:00:00Z',
    '2026-12-31T22:59:59Z', '2026-12-31T23:00:00Z',
    '2027-03-27T22:59:59Z', '2027-03-27T23:00:00Z', '2027-03-28T00:59:59Z', '2027-03-28T01:00:00Z',
    '2027-03-28T21:59:59Z', '2027-03-28T22:00:00Z',
    '2026-10-24T21:59:59Z', '2026-10-24T22:00:00Z', '2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z',
    '2026-10-25T22:59:59Z', '2026-10-25T23:00:00Z',
    '2026-11-01T22:59:00Z', '2026-10-28T22:59:59Z', '2027-03-20T22:59:59Z'
  ];
  for (const i of instantes) lineas.push(`${i} ${fechaMadrid(d(i))} ${msHastaMedianocheMadrid(d(i))}`);
  for (const f of ['2026-11-02', '2027-07-01', '2027-03-28', '2027-03-29', '2026-10-25', '2026-10-26', '2026-03-30', '2027-11-01']) {
    lineas.push(`${f} ${new Date(medianocheMadrid(f)).toISOString()}`);
  }
  for (let f = '2026-01-01'; f <= '2027-12-31'; f = sumarDias(f, 1)) {
    lineas.push(`${f} ${medianocheMadrid(f)} ${fechaMadrid(medianocheMadrid(f))} ${fechaMadrid(medianocheMadrid(f) - 1)}`);
  }
  for (let x = t('2026-01-01T00:00:00Z'); x < t('2028-01-01T00:00:00Z'); x += 3600000) {
    lineas.push(`${x} ${msHastaMedianocheMadrid(x)}`);
  }
  return lineas.join('\n');
}

test('338: fechaMadrid en invierno y verano', () => {
  assert.equal(ZONA_JUEGO, 'Europe/Madrid');
  const casos = [
    ['2026-11-01T22:59:59.999Z', '2026-11-01'], ['2026-11-01T23:00:00Z', '2026-11-02'],
    ['2027-06-30T21:59:59Z', '2027-06-30'], ['2027-06-30T22:00:00Z', '2027-07-01'],
    ['2026-12-31T22:59:59Z', '2026-12-31'], ['2026-12-31T23:00:00Z', '2027-01-01']
  ];
  for (const [i, e] of casos) assert.equal(fechaMadrid(d(i)), e, i);
  assert.equal(fechaMadrid(t('2026-11-01T23:00:00Z')), '2026-11-02');
});

test('339: fechaMadrid en los cambios de hora', () => {
  const casos = [
    ['2027-03-27T22:59:59Z', '2027-03-27'], ['2027-03-27T23:00:00Z', '2027-03-28'],
    ['2027-03-28T00:59:59Z', '2027-03-28'], ['2027-03-28T01:00:00Z', '2027-03-28'],
    ['2027-03-28T21:59:59Z', '2027-03-28'], ['2027-03-28T22:00:00Z', '2027-03-29'],
    ['2026-10-24T21:59:59Z', '2026-10-24'], ['2026-10-24T22:00:00Z', '2026-10-25'],
    ['2026-10-25T00:30:00Z', '2026-10-25'], ['2026-10-25T01:30:00Z', '2026-10-25'],
    ['2026-10-25T22:59:59Z', '2026-10-25'], ['2026-10-25T23:00:00Z', '2026-10-26']
  ];
  for (const [i, e] of casos) assert.equal(fechaMadrid(d(i)), e, i);
});

test('340: medianocheMadrid', () => {
  const casos = [
    ['2026-11-02', '2026-11-01T23:00:00Z'], ['2027-07-01', '2027-06-30T22:00:00Z'],
    ['2027-03-28', '2027-03-27T23:00:00Z'], ['2027-03-29', '2027-03-28T22:00:00Z'],
    ['2026-10-25', '2026-10-24T22:00:00Z'], ['2026-10-26', '2026-10-25T23:00:00Z'],
    ['2026-03-30', '2026-03-29T22:00:00Z'], ['2027-11-01', '2027-10-31T23:00:00Z']
  ];
  for (const [f, e] of casos) assert.equal(medianocheMadrid(f), t(e), f);
  for (let f = '2026-01-01'; f <= '2027-12-31'; f = sumarDias(f, 1)) {
    assert.equal(fechaMadrid(medianocheMadrid(f)), f);
    assert.equal(fechaMadrid(medianocheMadrid(f) - 1), sumarDias(f, -1));
  }
  for (const malo of ['2026-13-01', '2026-02-30', '', 20261101, undefined]) {
    assert.throws(() => medianocheMadrid(malo), TypeError, String(malo));
  }
});

test('341: msHastaMedianocheMadrid', () => {
  const casos = [
    ['2026-11-01T22:59:00Z', 60000], ['2026-11-01T23:00:00Z', 86400000],
    ['2027-03-27T23:00:00Z', 82800000], ['2027-03-28T00:59:59Z', 75601000], ['2027-03-28T01:00:00Z', 75600000],
    ['2026-10-24T22:00:00Z', 90000000], ['2026-10-25T00:30:00Z', 81000000], ['2026-10-25T01:30:00Z', 77400000]
  ];
  for (const [i, e] of casos) assert.equal(msHastaMedianocheMadrid(d(i)), e, i);
  assert.equal(formatearCuentaAtras(msHastaMedianocheMadrid(d('2026-10-24T22:00:01Z'))), '24:59:59');
  for (let x = t('2026-01-01T00:00:00Z'); x < t('2028-01-01T00:00:00Z'); x += 3600000) {
    const r = msHastaMedianocheMadrid(x);
    assert.ok(r > 0 && r <= 90000000, String(x));
    assert.equal(fechaMadrid(x + r), sumarDias(fechaMadrid(x), 1));
    assert.equal(fechaMadrid(x + r - 1), fechaMadrid(x));
  }
});

test('342: mismo resultado byte a byte con cualquier TZ del sistema', () => {
  const diario = new URL('../js/diario.js', import.meta.url).href;
  const guion = `
    const d = ${d.toString()};
    const t = ${t.toString()};
    ${informe.toString()}
    import { fechaMadrid, medianocheMadrid, msHastaMedianocheMadrid, sumarDias } from ${JSON.stringify(diario)};
    const loc = (iso) => new Date(iso).getDate() + ':' + new Date(iso).getHours();
    const extra = [
      loc('2026-11-01T22:59:59Z'), fechaMadrid(new Date('2026-11-01T22:59:59Z')),
      loc('2026-11-01T23:00:00Z'), fechaMadrid(new Date('2026-11-01T23:00:00Z')),
      loc('2026-11-01T15:30:00Z'), fechaMadrid(new Date('2026-11-01T15:30:00Z')),
      fechaMadrid(new Date('2026-10-28T22:59:59Z')), msHastaMedianocheMadrid(new Date('2026-10-28T22:59:59Z')),
      fechaMadrid(new Date('2027-03-20T22:59:59Z')), msHastaMedianocheMadrid(new Date('2027-03-20T22:59:59Z'))
    ];
    console.log(JSON.stringify(extra));
    console.log(informe());
  `;
  const zonas = ['Europe/Madrid', 'America/Mexico_City', 'America/New_York', 'Asia/Tokyo', 'UTC'];
  const salidas = {};
  for (const TZ of zonas) {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', guion], {
      env: { ...process.env, TZ, NODE_TEST_CONTEXT: undefined },
      encoding: 'utf8'
    });
    assert.equal(r.status, 0, `${TZ}: ${r.stderr}`);
    const [extra, ...resto] = r.stdout.split('\n');
    salidas[TZ] = { extra: JSON.parse(extra), resto: resto.join('\n') };
  }
  for (const TZ of zonas) assert.equal(salidas[TZ].resto, salidas['Europe/Madrid'].resto, TZ);
  const e = (TZ) => salidas[TZ].extra;
  assert.deepEqual(e('America/Mexico_City').slice(0, 4), ['1:16', '2026-11-01', '1:17', '2026-11-02']);
  assert.equal(e('America/New_York')[2], '1:18');
  assert.equal(e('America/New_York')[3], '2026-11-02');
  assert.deepEqual(e('Asia/Tokyo').slice(4, 6), ['2:0', '2026-11-01']);
  for (const TZ of zonas) assert.deepEqual(e(TZ).slice(6), ['2026-10-28', 1000, '2027-03-20', 1000], TZ);
});

test('343: entradas no válidas en fechaMadrid y msHastaMedianocheMadrid', () => {
  for (const malo of [new Date(NaN), '2026-11-01', undefined, Infinity, NaN, null, {}]) {
    assert.throws(() => fechaMadrid(malo), TypeError);
    assert.throws(() => msHastaMedianocheMadrid(malo), TypeError);
  }
});
