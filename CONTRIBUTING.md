# Contributing

Thanks for improving DSH Remote SSH.

## Development

```bash
git clone https://github.com/GaTTGeng/dsh-remote-ssh.git
cd dsh-remote-ssh
pnpm install
pnpm test
```

The integration test starts in-process SSH servers and does not need a real
bastion or remote host.

## Pull requests

- Keep changes focused and include a test for behavior changes where possible.
- Do not commit credentials, private keys, internal hostnames, bastion asset
  lists, or real customer data. Use `example.com`, `192.0.2.0/24`, and dummy
  credentials in tests and documentation.
- Run `pnpm test` before opening a pull request.
- Update `CHANGELOG.md` for user-visible changes.

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
