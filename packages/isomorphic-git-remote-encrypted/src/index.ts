import {
  encryptedFetch,
  encryptedInit,
  encryptedPush,
  FS,
  getEncryptedRefObjectId,
  getKeysFromDisk,
  GIT_ENCRYPTED_AUTHOR,
} from 'git-encrypted';
import git, { HttpClient } from 'isomorphic-git';
import { superpathjoin as join } from 'superpathjoin';
import { gitApi } from './gitApi';
import { packageLog } from './packageLog';
import { getIsEncryptedRemoteUrl } from './utils';
export { gitApi } from './gitApi';

type PushOrPullParams = {
  fs: FS;
  http: HttpClient;
  /**
   * The repo working directory.
   *
   * NOTE: This directory must have a `.git` directory directly inside it, no
   * other configurations are currentlysupported.
   */
  dir: string;

  /**
   * The local ref that should be pushed, fully specified, like
   * `refs/heads/master`.
   */
  ref?: string;
  /**
   * The remote ref that should be updated, fully specified, like
   * `refs/heads/master`.
   */
  remoteRef?: string;
  /**
   * The name of the remote that should be pushed to, like `origin`.
   */
  remote?: string;
};

const pushLog = packageLog.extend('simplePush');
const pullLog = packageLog.extend('simplePull');
const cloneLog = packageLog.extend('simpleClone');

export const getMaybeEncrtyptedRemoteUrl = async (
  params: Pick<PushOrPullParams, 'fs' | 'remote' | 'dir'>
) => {
  const { remote, ...base } = params;
  const remotes = await git.listRemotes(base);
  const remoteWithUrl = remotes.find(r => r.remote === remote);
  if (typeof remoteWithUrl === 'undefined') {
    throw new Error(`Remote ${remote} not found. #qgCrgi`);
  }

  return getIsEncryptedRemoteUrl(remoteWithUrl.url);
};

/**
 * Something akin to `git push remote ref:remoteRef` without any parameters.
 *
 * Currently you must supply the remote name,
 */
export const simplePushWithOptionalEncryption = async (params: {
  fs: FS;
  http: HttpClient;
  dir: string;
  /**
   * The local ref that should be pushed, fully specified, like
   * `refs/heads/master`.
   */
  ref?: string;
  /**
   * The remote ref that should be updated, fully specified, like
   * `refs/heads/master`.
   */
  remoteRef?: string;
  /**
   * The name of the remote that should be pushed to, like `origin`.
   */
  remote?: string;
}) => {
  const {
    fs,
    http,
    dir,
    ref = 'refs/heads/master',
    remoteRef = 'refs/heads/master',
    remote = 'origin',
  } = params;
  const gitdir = join(dir, '.git');

  pushLog('Invoked #uuUqDF', { dir, gitdir, ref, remoteRef, remote });

  const {
    isEncryptedRemote,
    encryptedRemoteUrl,
  } = await getMaybeEncrtyptedRemoteUrl({
    fs,
    dir,
    remote,
  });

  // If this is not an encrypted remote, then call the standard `git.push()`
  if (!isEncryptedRemote) {
    return git.push(params);
  }

  const keys = await getKeysFromDisk({ fs, gitdir });

  return encryptedPush({
    fs,
    http,
    gitApi,
    gitdir,
    keys,
    refs: [{ src: ref, dst: remoteRef, force: false }],
    // NOTE: We need to type cast this here because TypeScript cannot understand
    // from the `if (!isEncryptedRemote)` check above, that we now know this
    // will definitely be a string.
    encryptedRemoteUrl: encryptedRemoteUrl as string,
  });
};

export const simplePullWithOptionalEncryption = async (
  params: PushOrPullParams
) => {
  const {
    fs,
    http,
    dir,
    ref = 'refs/heads/master',
    remoteRef = 'refs/heads/master',
    remote = 'origin',
  } = params;
  const gitdir = join(dir, '.git');

  pullLog('Invoked #aUnKFu', { dir, gitdir, ref, remoteRef, remote });

  const {
    isEncryptedRemote,
    encryptedRemoteUrl,
  } = await getMaybeEncrtyptedRemoteUrl({
    fs,
    dir,
    remote,
  });

  if (!isEncryptedRemote) {
    await git.push(params);
    return;
  }

  const keys = await getKeysFromDisk({ fs, gitdir });

  await encryptedFetch({
    fs,
    http,
    gitApi,
    gitdir,
    keys,
    encryptedRemoteUrl: encryptedRemoteUrl as string,
  });

  const commitId = await getEncryptedRefObjectId({
    fs,
    http,
    gitdir,
    keys,
    ref: remoteRef,
  });

  if (typeof commitId === 'undefined') {
    throw new Error(
      'simplePullWithOptionalEncryption() failed to find remote ref #3SaIcw'
    );
  }

  await git.merge({
    fs,
    gitdir,
    theirs: commitId,
    fastForwardOnly: false,
    author: GIT_ENCRYPTED_AUTHOR,
  });

  await git.checkout({ fs, dir, ref });
};

/**
 * Something akin to `git clone`.
 *
 * NOTE: You must specify the remote and local refs. This will be improved in
 * the future, and they default to `refs/heads/master` for now.
 */
export const simpleEncryptedClone = async (
  params: Omit<PushOrPullParams, 'remote'> & {
    /**
     * The remote URL, prefixed with `encrypted::passphrase` if it is an
     * encrypted repo.
     */
    url: string;
  }
) => {
  const {
    fs,
    http,
    dir,
    url,
    ref = 'refs/heads/master',
    remoteRef = 'refs/heads/master',
  } = params;
  const gitdir = join(dir, '.git');

  cloneLog('Invoked #zdDigE', { dir, gitdir, url, ref, remoteRef });

  const {
    isEncryptedRemote,
    encryptedRemoteUrl,
    keyDerivationPassword,
  } = getIsEncryptedRemoteUrl(url);

  if (!isEncryptedRemote) {
    throw new Error('Remote url without encrypted:: supplied #wWsiGr');
  }

  // Init a new repo at dir
  await git.init({ fs, dir });

  cloneLog('encryptedInit() #kRHgyD');
  await encryptedInit({
    fs,
    http,
    gitdir,
    encryptedRemoteUrl: encryptedRemoteUrl as string,
    keyDerivationPassword: keyDerivationPassword as string,
    gitApi,
  });

  cloneLog('git.addRemote() #FfHjvv');
  // Set the encrypted remote on the source repo
  await git.addRemote({ fs, gitdir, remote: 'origin', url, force: true });

  cloneLog('getKeysFromDisk() #2DX97q');
  const keys = await getKeysFromDisk({ fs, gitdir });

  cloneLog('encryptedFetch() #JcafjM');
  await encryptedFetch({
    fs,
    http,
    gitdir,
    gitApi,
    encryptedRemoteUrl: url,
    keys,
  });
  cloneLog('getEncryptedRefObjectId() #7BiUlT');
  const headCommitObjectId = await getEncryptedRefObjectId({
    fs,
    http,
    gitdir,
    keys,
    ref,
  });
  if (typeof headCommitObjectId === 'undefined') {
    throw new Error('Failed to get HEAD commit from encrypted repo. #JgEf7I');
  }

  cloneLog('git.writeRef() #ViIfJo');
  await git.writeRef({
    fs,
    gitdir,
    ref: 'refs/heads/master',
    value: headCommitObjectId,
    force: true,
  });
  cloneLog('git.checkout() #7aMZpt');
  await git.checkout({ fs, dir });

  cloneLog('simplePullWithOptionalEncryption() #SO1xTQ');

  // TODO Get the HEAD encrypted ref then hand over to the simple pull
  await simplePullWithOptionalEncryption({
    fs,
    http,
    dir,
    remote: 'origin',
    ref,
    remoteRef,
  });
};
