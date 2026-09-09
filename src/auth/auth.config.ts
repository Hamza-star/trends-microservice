export interface ServiceCredential {
  project: string;
  token: string;
}

export default (): { auth: { serviceTokens: ServiceCredential[] } } => ({
  auth: {
    serviceTokens: (process.env.SERVICE_TOKENS ?? '')
      .split(',')
      .map((credential) => {
        const separatorIndex = credential.indexOf(':');

        return {
          project: separatorIndex >= 0 ? credential.slice(0, separatorIndex).trim() : '',
          token: separatorIndex >= 0 ? credential.slice(separatorIndex + 1).trim() : '',
        };
      })
      .filter(({ project, token }) => project && token),
  },
});