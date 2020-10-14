import { decodeBase64 } from 'tweetnacl-util';
import { KEYS } from './crypto';

export const ENCRYPTED_DIR = 'encrypted' as const;

export const REF_OID = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export const GIT_ENCRYPTED_AUTHOR = {
  name: 'Encryption',
} as const;
export const GIT_ENCRYPTED_MESSAGE = 'Encrypted push' as const;

export const DEFAULT_KEYS: KEYS = {
  secret: decodeBase64('OTdY2G5jOtUb4NkTIrcMic5Om2FSGVNr+mOV21bMfkY='),
  secretNonce: decodeBase64('wIfKspQFPMhcpxWSNO/d/aA50ErheC6t'),
  filenames: decodeBase64('aeFYzTwOrPbAPu7Lyw1QZ34JglphbLTgAAHtjr2Zcps='),
  filenamesNonce: decodeBase64('JbTmJEJIT3fx2agUFmLFkb0Zk60/Eeoa'),
};
