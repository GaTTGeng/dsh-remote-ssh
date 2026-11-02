# Changelog

All notable changes to this project are documented here. This project uses
semantic versioning for the local DSH bundle.

## 0.8.0

- Removed the model-facing bastion asset search; the model no longer receives
  the bastion's full asset list.
- Bastion PTY errors no longer include menu output.
- `ssh_add_host` returns only whether the host was added and minimal host info;
  it no longer returns the whole connection group.
- `ssh_add_host` can reuse an existing bastion login with `bastionHostId`.
- UI asset search remains available for human operators.

## 0.7.0

- Added saved-bastion presets when adding a host: select an existing bastion
  entry instead of re-entering its address, port, user, and password.
- Added `bastionHostId` to the add-host flow and tool.
- Host cards are collapsed by default and expand on click.

## 0.6.0

- Sangfor asset selection changed from page/row numbers to an asset IP field
  with live fuzzy search.
- Connections use `g <IP>` and pick the first match (exact IP preferred).
- Added `ssh_search_assets` (later removed in 0.8.0).

## 0.5.0

- Added Sangfor bastion transport with PTY menu automation.
- Added `account` (`root` / `user`) to `ssh_exec`.
- Added target username/password storage.

## 0.4.0

- Added management tools for updating groups/hosts and removing hosts/groups.
- Added host-key reset and credential rotation.

## 0.3.0

- Added per-host elevation modes (`none`, `sudo`, `sudo-i`) and `root=true`.
- Added optional elevation password.

## 0.2.0

- Connection groups with multiple hosts and one shared note.
- Multi-host execution, host tests, slash commands, and v1 data migration.

## 0.1.0

- Initial DSH Web plugin: sidebar panel, password/key SSH connections,
  credential-backed execution, and notes.
