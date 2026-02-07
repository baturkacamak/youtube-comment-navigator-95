interface ZipFileEntry {
  path: string;
  data: Uint8Array;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (input: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < input.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ input[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const textEncoder = new TextEncoder();

const toDosDateTime = (date: Date): { dosDate: number; dosTime: number } => {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  const dosTime = (hours << 11) | (minutes << 5) | seconds;

  return { dosDate, dosTime };
};

const writeUint16 = (view: DataView, offset: number, value: number): number => {
  view.setUint16(offset, value, true);
  return offset + 2;
};

const writeUint32 = (view: DataView, offset: number, value: number): number => {
  view.setUint32(offset, value, true);
  return offset + 4;
};

const concatUint8Arrays = (parts: Uint8Array[]): Uint8Array => {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
};

export const createZipArchive = (entries: ZipFileEntry[]): Blob => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const now = new Date();
  const { dosDate, dosTime } = toDosDateTime(now);

  let localOffset = 0;

  for (const entry of entries) {
    const fileNameBytes = textEncoder.encode(entry.path);
    const fileData = entry.data;
    const fileCrc = crc32(fileData);

    const localHeader = new Uint8Array(30 + fileNameBytes.length);
    const localView = new DataView(localHeader.buffer);

    let cursor = 0;
    cursor = writeUint32(localView, cursor, 0x04034b50);
    cursor = writeUint16(localView, cursor, 20);
    cursor = writeUint16(localView, cursor, 0);
    cursor = writeUint16(localView, cursor, 0);
    cursor = writeUint16(localView, cursor, dosTime);
    cursor = writeUint16(localView, cursor, dosDate);
    cursor = writeUint32(localView, cursor, fileCrc);
    cursor = writeUint32(localView, cursor, fileData.length);
    cursor = writeUint32(localView, cursor, fileData.length);
    cursor = writeUint16(localView, cursor, fileNameBytes.length);
    cursor = writeUint16(localView, cursor, 0);
    localHeader.set(fileNameBytes, cursor);

    localParts.push(localHeader);
    localParts.push(fileData);

    const centralHeader = new Uint8Array(46 + fileNameBytes.length);
    const centralView = new DataView(centralHeader.buffer);

    cursor = 0;
    cursor = writeUint32(centralView, cursor, 0x02014b50);
    cursor = writeUint16(centralView, cursor, 20);
    cursor = writeUint16(centralView, cursor, 20);
    cursor = writeUint16(centralView, cursor, 0);
    cursor = writeUint16(centralView, cursor, 0);
    cursor = writeUint16(centralView, cursor, dosTime);
    cursor = writeUint16(centralView, cursor, dosDate);
    cursor = writeUint32(centralView, cursor, fileCrc);
    cursor = writeUint32(centralView, cursor, fileData.length);
    cursor = writeUint32(centralView, cursor, fileData.length);
    cursor = writeUint16(centralView, cursor, fileNameBytes.length);
    cursor = writeUint16(centralView, cursor, 0);
    cursor = writeUint16(centralView, cursor, 0);
    cursor = writeUint16(centralView, cursor, 0);
    cursor = writeUint16(centralView, cursor, 0);
    cursor = writeUint32(centralView, cursor, 0);
    cursor = writeUint32(centralView, cursor, localOffset);
    centralHeader.set(fileNameBytes, cursor);

    centralParts.push(centralHeader);
    localOffset += localHeader.length + fileData.length;
  }

  const centralDirectory = concatUint8Arrays(centralParts);
  const localDirectory = concatUint8Arrays(localParts);

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  let endCursor = 0;
  endCursor = writeUint32(endView, endCursor, 0x06054b50);
  endCursor = writeUint16(endView, endCursor, 0);
  endCursor = writeUint16(endView, endCursor, 0);
  endCursor = writeUint16(endView, endCursor, entries.length);
  endCursor = writeUint16(endView, endCursor, entries.length);
  endCursor = writeUint32(endView, endCursor, centralDirectory.length);
  endCursor = writeUint32(endView, endCursor, localDirectory.length);
  writeUint16(endView, endCursor, 0);

  const zipBytes = concatUint8Arrays([localDirectory, centralDirectory, endRecord]);
  const buffer = new ArrayBuffer(zipBytes.byteLength);
  new Uint8Array(buffer).set(zipBytes);
  return new Blob([buffer], { type: 'application/zip' });
};

export const textToBytes = (input: string): Uint8Array => {
  return textEncoder.encode(input);
};
