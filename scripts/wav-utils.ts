export function audioBufferToWav(buffer: AudioBuffer): Buffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numFrames = buffer.length;
  const dataSize = numFrames * numChannels * bytesPerSample;
  const headerSize = 44;
  const out = Buffer.alloc(headerSize + dataSize);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) out[offset + i] = s.charCodeAt(i);
  };
  writeStr(0, 'RIFF');
  out.writeUInt32LE(36 + dataSize, 4);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(numChannels, 22);
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  out.writeUInt16LE(numChannels * bytesPerSample, 32);
  out.writeUInt16LE(bitsPerSample, 34);
  writeStr(36, 'data');
  out.writeUInt32LE(dataSize, 40);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

  let offset = headerSize;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      out.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, offset);
      offset += 2;
    }
  }
  return out;
}
