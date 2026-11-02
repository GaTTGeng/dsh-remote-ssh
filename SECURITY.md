# Security Policy

## Supported versions

Security fixes are provided for the latest released minor version (`0.8.x`).

## Reporting a vulnerability

Please use GitHub's **private vulnerability reporting** for this repository
(Security → Report a vulnerability). Do not open a public issue for a suspected
vulnerability.

Do not include real passwords, private keys, tokens, internal hostnames, or
bastion asset lists in a report. Redact or replace them with placeholders.

## Credential model

- Passwords, private keys, passphrases, elevation passwords, and target
  passwords are stored through the DSH credential service, keyed by host id.
- `profiles.json` contains metadata only: labels, endpoints, asset IPs, account
  mode, host-key fingerprints, and shared notes.
- SSH host keys use trust-on-first-use (TOFU); a changed fingerprint is rejected
  until explicitly reset.
- The model-facing tools do not return stored credentials. Bastion menu output is
  not returned to the model; model-visible errors are sanitized.
- Shared notes are visible to the model and must never contain secrets.
