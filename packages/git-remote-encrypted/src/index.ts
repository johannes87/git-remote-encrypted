#!/usr/bin/env node

import fs from 'fs';
import {
  DEFAULT_KEYS,
  encryptedFetch,
  encryptedInit,
  encryptedPush,
  EncryptedPushResult,
  getRefsGitString,
  nodeGitApi as gitApi,
} from 'git-encrypted';
import GitRemoteHelper from 'git-remote-helper';
import http from 'isomorphic-git/http/node';
import { packageLog } from './log';

globalThis['__DEV__'] = process.env.NODE_ENV !== 'production';

const log = packageLog.extend('cli');
const logInit = log.extend('init');
const logList = log.extend('list');
const logPush = log.extend('push');
const logFetch = log.extend('fetch');

const baseGitParams = {
  fs,
  http,
  getKeys: async () => DEFAULT_KEYS,
  gitApi,
};

GitRemoteHelper({
  env: process.env,
  stdin: process.stdin,
  stdout: process.stdout,
  api: {
    init: async ({ gitdir, remoteUrl, remoteName }) => {
      logInit(
        'Invoked #raSclb',
        JSON.stringify({ gitdir, remoteUrl, remoteName })
      );

      // We always need to call `encryptedInit()` before running any other
      // operations. By calling it here we can ensure that it's only called once
      // per invocation of the git-remote-helper.
      await encryptedInit({
        ...baseGitParams,
        gitdir,
        encryptedRemoteUrl: remoteUrl,
      });
    },
    list: async ({ gitdir, forPush, refs }) => {
      logList('Got list command #VJhzH4', gitdir, forPush, refs);

      const refsString = await getRefsGitString({
        ...baseGitParams,
        gitdir,
      });

      // In the event of an empty string, return just one newline
      if (refsString.length === 0) {
        return '\n';
      }

      return `${refsString}\n\n`;
    },
    handleFetch: async ({ gitdir, refs, remoteUrl }) => {
      logFetch('handleFetch() invoked #nGa2WK', JSON.stringify({ refs }));

      await encryptedFetch({
        ...baseGitParams,
        gitdir,
        remoteUrl,
      });

      // Fetch need only return a single newline after it's completed, then it
      // is assumed to have succeeded.
      return '\n';
    },
    handlePush: async ({ refs, gitdir, remoteUrl }) => {
      logPush('handlePush() invoked #Fl6g38');

      const results = await encryptedPush({
        ...baseGitParams,
        gitdir,
        remoteUrl,
        refs,
      });

      const outputString = results
        .map(refResult => {
          const isError = refResult.result === EncryptedPushResult.error;
          const okOrError = isError ? 'error' : 'ok';
          const errorMessagePlusSpace = isError
            ? ' Encrypted push error. Try DEBUG=* fore more info. #qRoqYY'
            : '';

          return `${okOrError} ${refResult.dst}${errorMessagePlusSpace}`;
        })
        .join('\n');

      if (outputString.length === 0) {
        return '\n';
      }

      return outputString + '\n\n';
    },
  },
}).catch(error => {
  console.error('GitRemoteHelper ERROR #W9flRj');
  console.error(error);
});
