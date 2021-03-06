import Bluebird from 'bluebird';
import { superpathjoin as join } from 'superpathjoin';
import { decodeUTF8, encodeUTF8 } from 'tweetnacl-util';
import {
  createNonce,
  decryptFile,
  decryptFileContentsOnly,
  encryptFile,
  encryptFilename,
} from './crypto';
import { GitBaseParamsEncrypted, Keys, RefPair } from './types';
import { doesFileExist, getEncryptedRefsDir } from './utils';

export const refPairsToGitString = ({ refPairs }: { refPairs: RefPair[] }) => {
  return refPairs
    .map(pair => {
      // NOTE: The order in our RefPair array is ref objectId, but for git
      // output, we need to flip that.
      const [ref, objectId] = pair;
      return `${objectId} ${ref}`;
    })
    .join('\n');
};

export const getEncryptedRefPairs = async ({
  fs,
  gitdir,
  keys,
}: Pick<GitBaseParamsEncrypted, 'fs' | 'gitdir' | 'keys'>) => {
  const encryptedRefsDir = getEncryptedRefsDir({ gitdir });
  const encryptedRefFileNames = await fs.promises.readdir(encryptedRefsDir);
  const refPairs = await Bluebird.map(
    encryptedRefFileNames,
    async encryptedRefFilename => {
      const path = join(encryptedRefsDir, encryptedRefFilename);
      const fileContents = await fs.promises.readFile(path);

      const [ref, objectIdArray] = await decryptFile({
        fileContents,
        encryptedFilenameHex: encryptedRefFilename,
        keys,
      });
      const objectId = encodeUTF8(objectIdArray);

      return [ref, objectId] as [string, string];
    }
  );
  return refPairs;
};

export const getEncryptedRefFilename = async ({
  keys,
  ref,
}: {
  ref: string;
  keys: Keys;
}) => {
  const refArray = decodeUTF8(ref);
  const nonce = await createNonce({ salt: keys.salt, input: refArray });
  const encryptedFilename = encryptFilename({
    keys,
    nonce,
    filenameArray: refArray,
  });
  return encryptedFilename;
};

/**
 * Try to find an encrypted ref in the enrypted/refs directory. If not found,
 * return `"?""` as the value.
 */
export const readEncryptedRef = async ({
  fs,
  gitdir,
  ref,
  keys,
}: Pick<GitBaseParamsEncrypted, 'fs' | 'gitdir' | 'keys'> & {
  ref: string;
}) => {
  const encryptedRefsDir = getEncryptedRefsDir({ gitdir });
  const encryptedRefFilename = await getEncryptedRefFilename({ keys, ref });
  const path = join(encryptedRefsDir, encryptedRefFilename);

  if (await doesFileExist({ fs, path })) {
    const fileContents = await fs.promises.readFile(path);
    const contentArray = await decryptFileContentsOnly({
      fileContents,
      keys,
    });
    const objectId = encodeUTF8(contentArray);
    return objectId;
  }

  return '?';
};

export const writeEncryptedRef = async ({
  fs,
  keys,
  gitdir,
  objectId,
  ref,
}: Pick<GitBaseParamsEncrypted, 'fs' | 'gitdir' | 'keys'> & {
  ref: string;
  objectId: string;
}) => {
  const contents = decodeUTF8(objectId);

  const [filename, encryptedContents] = await encryptFile({
    filename: ref,
    contents,
    keys,
  });

  const encryptedRefsDir = getEncryptedRefsDir({ gitdir });
  const path = join(encryptedRefsDir, filename);

  await fs.promises.writeFile(path, encryptedContents);
};
