import { createSetupAsyncMock } from './utils';

import type { HidIO } from 'with-hid';

function mockHid() {
  const mock = {
    write: vi.fn().mockResolvedValue(0),
    read: vi.fn().mockResolvedValue(Buffer.alloc(0)),
  };

  const read = createSetupAsyncMock<Buffer>(mock.read);
  const mockClear = () => {
    mock.write.mockClear();
    mock.write.mockResolvedValue(0);
    mock.read.mockClear();
    mock.read.mockResolvedValue(Buffer.alloc(0));
  };

  const hid: HidIO = mock as any;
  return {
    mock, mockClear, mockSetup: { read }, hid,
  };
}

vi.mock('with-hid', () => ({
  withHid: vi.fn(),
  findHidDevices: vi.fn(),
}));

type MockHid = ReturnType<typeof mockHid>;

function mockWithHid(withHid: unknown) {
  if (!(vi.isMockFunction(withHid))) {
    throw new Error('Provided `withHid` is not a mocked function.');
  }

  const mock = mockHid();
  withHid.mockImplementation((_device: unknown, process: (hid: HidIO) => unknown) => {
    return process(mock.hid);
  });
  return mock;
}

declare global {
  function mockHid(): MockHid;
  function mockWithHid(withHid: unknown): MockHid;
}

globalThis.mockHid = mockHid;
globalThis.mockWithHid = mockWithHid;
