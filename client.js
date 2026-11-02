window.__ModuleLoader__.load({
  id: '@local/dsh-remote-ssh',
  factory(require) {
    const React = require('react')
    const { useCallback, useEffect, useRef, useState } = React
    const h = React.createElement
    const NS = 'remote-ssh'
    const API_ROOT = 'remote-ssh/api'

    const zh = {
      'panel.title': '远程管理',
      'panel.subtitle': '每个连接组可以包含多台主机，共享一份备注；模型按主机执行命令。',
      'page.refresh': '刷新',
      'page.securityNote': '凭据保存在本地凭据库，插件不会在接口或工具结果中返回密码/私钥。备注会提供给模型，请勿写入敏感信息。',
      'page.loadFailed': '连接列表加载失败',
      'page.retry': '重试',
      'add': '新增连接组',
      'empty.title': '还没有连接组',
      'empty.body': '创建连接组后，添加一台或多台主机；整组共享一份备注，模型可以按主机执行命令。',
      'card.test': '测试',
      'card.testing': '测试中…',
      'card.edit': '编辑',
      'card.copyId': '复制 ID',
      'card.delete': '删除',
      'card.confirmDelete': '确认删除',
      'card.cancel': '取消',
      'card.noteEmpty': '还没有备注。模型可以在执行命令后追加备注。',
      'card.credentialMissing': '凭据缺失',
      'card.idLabel': '连接 ID',
      'card.fingerprint': '主机指纹',
      'card.testOk': '连接成功',
      'card.testFailed': '连接失败',
      'auth.password': '密码',
      'auth.privateKey': '私钥',
      'form.newTitle': '新增 SSH 连接',
      'form.editTitle': '编辑 SSH 连接',
      'form.name': '名称',
      'form.namePlaceholder': '例如：生产 Web 服务器',
      'form.host': '主机',
      'form.hostPlaceholder': 'IP 或域名',
      'form.port': '端口',
      'form.username': '用户名',
      'form.authType': '认证方式',
      'form.password': '密码',
      'form.passwordPlaceholder': '输入登录密码',
      'form.privateKey': '私钥',
      'form.privateKeyPlaceholder': '-----BEGIN OPENSSH PRIVATE KEY-----\n…',
      'form.privateKeyHint': '支持 OpenSSH / PEM。可直接粘贴，也可选择本地私钥文件。',
      'form.chooseFile': '选择私钥文件',
      'form.passphrase': '私钥口令',
      'form.passphrasePlaceholder': '如果私钥没有口令，留空即可',
      'form.show': '显示',
      'form.hide': '隐藏',
      'form.note': '备注',
      'form.notePlaceholder': '这台机器是做什么的？例如：生产 Web 服务器，nginx 配置在 /etc/nginx。',
      'form.noteHint': '备注会提供给模型，用于跨会话记住这台机器上做过什么。请勿写入密码、私钥或令牌。',
      'form.secretKeep': '已保存凭据。留空表示不修改。',
      'form.secretMissing': '凭据缺失，请重新填写密码或私钥。',
      'form.secretRequired': '请填写密码或私钥。',
      'form.secretRequiredNew': '首次保存时必须填写密码或私钥。',
      'form.nameRequired': '请填写名称。',
      'form.hostRequired': '请填写主机。',
      'form.usernameRequired': '请填写用户名。',
      'form.portInvalid': '端口必须是 1-65535 的整数。',
      'form.save': '保存',
      'form.saving': '保存中…',
      'form.cancel': '取消',
      'form.close': '关闭',
      'form.hostKey': '主机指纹',
      'form.hostKeyHint': '首次连接成功后自动记录（TOFU）。服务器重装或更换密钥后，如确认无误可重置。',
      'form.resetHostKey': '重置主机指纹',
      'form.resetHostKeyHint': '下次连接时会重新记录当前服务器的主机指纹。',
      'form.warningModel': '保存后，模型可以直接在此连接上执行命令。',
      'toast.saved': '连接已保存',
      'toast.deleted': '连接已删除',
      'toast.copied': '连接 ID 已复制',
      'toast.copyFailed': '复制失败，请手动选择 ID',
      'test.success': '连接成功',
      'test.failure': '连接失败',
      'common.unknown': '未知错误',
      'group.hostCountOne': '1 台主机',
      'group.hostCount': '{n} 台主机',
      'group.expand': '展开',
      'group.collapse': '收起',
      'group.idLabel': '连接组 ID',
      'group.noHosts': '这个连接组还没有主机',
      'group.hostsTitle': '主机',
      'group.addHost': '添加主机',
      'group.edit': '编辑分组',
      'group.copyId': '复制 ID',
      'group.delete': '删除分组',
      'group.confirmDelete': '确认删除分组',
      'group.testAll': '测试全部',
      'group.testingAll': '测试中…',
      'group.noteEmpty': '整组共享备注。模型可以在执行命令后追加记录。',
      'group.missingCredential': '有主机凭据缺失',
      'group.form.newTitle': '新增连接组',
      'group.form.editTitle': '编辑连接组',
      'group.form.name': '连接组名称',
      'group.form.namePlaceholder': '例如：生产集群',
      'group.form.note': '共享备注',
      'group.form.notePlaceholder': '这个连接组是做什么的？例如：生产集群，三台 Web 节点。',
      'group.form.noteHint': '备注由整组共享，模型会看到；请勿写入密码、私钥或令牌。',
      'group.form.warningModel': '保存后，模型可以在组内主机上执行命令。',
      'host.test': '测试',
      'host.testing': '测试中…',
      'host.edit': '编辑',
      'host.delete': '删除',
      'host.confirmDelete': '确认删除',
      'host.cancel': '取消',
      'host.credentialMissing': '凭据缺失',
      'host.form.newTitle': '添加主机',
      'host.form.editTitle': '编辑主机',
      'host.form.label': '主机标签',
      'host.form.labelPlaceholder': '例如：node1',
      'host.form.labelRequired': '请填写主机标签。',
      'host.form.warningModel': '保存后，模型可以在这台主机上执行命令。',
      'form.elevation': '提权方式',
      'form.elevationNone': '不提权',
      'form.elevationSudo': 'sudo',
      'form.elevationSudoI': 'sudo su -（sudo -i）',
      'form.elevationPassword': '提权密码（可选）',
      'form.elevationPasswordPlaceholder': 'sudo 需要密码时填写；留空表示免密',
      'form.elevationHint': '模型只需要设置 root=true，插件会按这里配置的方式提权。',
      'form.transport': '连接方式',
      'form.transportSsh': '标准 SSH',
      'form.transportSangfor': '深信服堡垒机',
      'form.bastionHint': '堡垒机模式下，上面的地址/端口/用户是堡垒机入口，密码或私钥用于登录堡垒机。目标资产通过菜单编号选择。',
      'form.bastionPreset': '已保存的堡垒机',
      'form.bastionPresetManual': '手动填写新堡垒机',
      'form.bastionPresetHint': '选择已保存的堡垒机后会自动填入地址/端口/用户，并复用其登录凭据，不需要再次输入密码。',
      'form.bastionPresetReuseHint': '已复用所选堡垒机的登录凭据；密码/私钥不需要再填。',
      'form.bastionAddress': '堡垒机地址',
      'form.bastionUser': '堡垒机登录用户',
      'form.asset': '资产编号',
      'form.assetPlaceholder': '菜单中的编号，例如 10',
      'form.assetIp': '资产 IP',
      'form.assetIpPlaceholder': '输入 IP，例如 192.0.2.81',
      'form.assetIpRequired': '请填写资产 IP。',
      'form.assetIpInvalid': '请输入完整的 IPv4 地址，例如 192.0.2.81。',
      'form.assetSearchHint': '输入 IP 时实时搜索堡垒机资产；连接时使用 g <IP> 选择第一个匹配项。',
      'form.assetSearching': '搜索中…',
      'form.assetNoResults': '没有匹配的资产',
      'form.assetSearchUnavailable': '当前连接组还没有可用的堡垒机主机，先保存主机后可在编辑页搜索。',
      'form.assetSearchUsing': '使用 {name} 的堡垒机连接搜索',
      'form.assetPage': '资产所在页',
      'form.assetInvalid': '请输入菜单中的数字资产编号。',
      'form.assetPageInvalid': '资产页码必须是正整数。',
      'form.targetUsernameRequired': '使用 $user 账号时请填写目标用户名。',
      'form.account': '默认账号',
      'form.accountRoot': 'root',
      'form.accountUser': '$user',
      'form.targetUsername': '目标用户名（$user 时）',
      'form.targetUsernamePlaceholder': '例如 user1',
      'form.targetPassword': '目标密码（可选）',
      'form.targetPasswordPlaceholder': '堡垒机要求目标密码时填写；留空保持已保存值',
      'host.sangforBadge': '堡垒机',
      'toast.groupSaved': '连接组已保存',
      'toast.groupDeleted': '连接组已删除',
      'toast.hostSaved': '主机已保存',
      'toast.hostDeleted': '主机已删除',
    }

    const en = {
      'panel.title': 'Remote SSH',
      'panel.subtitle': 'Each group can contain several hosts and shares one note; the agent runs commands per host.',
      'page.refresh': 'Refresh',
      'page.securityNote': 'Credentials live in the local credential store and are never returned by the API or tools. Notes are shared with the model, so do not put secrets in them.',
      'page.loadFailed': 'Could not load connections',
      'page.retry': 'Retry',
      'add': 'New group',
      'empty.title': 'No connection groups yet',
      'empty.body': 'Create a group, add one or more hosts, and keep one shared note; the agent can run commands per host.',
      'card.test': 'Test',
      'card.testing': 'Testing…',
      'card.edit': 'Edit',
      'card.copyId': 'Copy ID',
      'card.delete': 'Delete',
      'card.confirmDelete': 'Confirm delete',
      'card.cancel': 'Cancel',
      'card.noteEmpty': 'No notes yet. The agent can append notes after running commands.',
      'card.credentialMissing': 'Credential missing',
      'card.idLabel': 'Connection ID',
      'card.fingerprint': 'Host fingerprint',
      'card.testOk': 'Connected',
      'card.testFailed': 'Connection failed',
      'auth.password': 'Password',
      'auth.privateKey': 'Private key',
      'form.newTitle': 'Add SSH connection',
      'form.editTitle': 'Edit SSH connection',
      'form.name': 'Name',
      'form.namePlaceholder': 'e.g. Production web server',
      'form.host': 'Host',
      'form.hostPlaceholder': 'IP or hostname',
      'form.port': 'Port',
      'form.username': 'Username',
      'form.authType': 'Authentication',
      'form.password': 'Password',
      'form.passwordPlaceholder': 'Login password',
      'form.privateKey': 'Private key',
      'form.privateKeyPlaceholder': '-----BEGIN OPENSSH PRIVATE KEY-----\n…',
      'form.privateKeyHint': 'OpenSSH or PEM. Paste the key or choose a local key file.',
      'form.chooseFile': 'Choose key file',
      'form.passphrase': 'Key passphrase',
      'form.passphrasePlaceholder': 'Leave empty if the key has no passphrase',
      'form.show': 'Show',
      'form.hide': 'Hide',
      'form.note': 'Note',
      'form.notePlaceholder': 'What is this machine for? e.g. Production web server; nginx config lives in /etc/nginx.',
      'form.noteHint': 'Notes are shared with the model to remember what was done across sessions. Do not put passwords, keys, or tokens in them.',
      'form.secretKeep': 'A credential is saved. Leave blank to keep it.',
      'form.secretMissing': 'The saved credential is missing; enter it again.',
      'form.secretRequired': 'Enter a password or private key.',
      'form.secretRequiredNew': 'A password or private key is required when saving for the first time.',
      'form.nameRequired': 'Name is required.',
      'form.hostRequired': 'Host is required.',
      'form.usernameRequired': 'Username is required.',
      'form.portInvalid': 'Port must be an integer from 1 to 65535.',
      'form.save': 'Save',
      'form.saving': 'Saving…',
      'form.cancel': 'Cancel',
      'form.close': 'Close',
      'form.hostKey': 'Host fingerprint',
      'form.hostKeyHint': 'Recorded on the first successful connection (TOFU). Reset it after a deliberate server reinstall or key change.',
      'form.resetHostKey': 'Reset host fingerprint',
      'form.resetHostKeyHint': 'The next connection records the current host fingerprint again.',
      'form.warningModel': 'After saving, the agent can run commands on this connection.',
      'toast.saved': 'Connection saved',
      'toast.deleted': 'Connection deleted',
      'toast.copied': 'Connection ID copied',
      'toast.copyFailed': 'Copy failed; select the ID manually',
      'test.success': 'Connected',
      'test.failure': 'Connection failed',
      'common.unknown': 'Unknown error',
      'group.hostCountOne': '1 host',
      'group.hostCount': '{n} hosts',
      'group.expand': 'Expand',
      'group.collapse': 'Collapse',
      'group.idLabel': 'Group ID',
      'group.noHosts': 'This group has no hosts yet',
      'group.hostsTitle': 'Hosts',
      'group.addHost': 'Add host',
      'group.edit': 'Edit group',
      'group.copyId': 'Copy ID',
      'group.delete': 'Delete group',
      'group.confirmDelete': 'Confirm delete',
      'group.testAll': 'Test all',
      'group.testingAll': 'Testing…',
      'group.noteEmpty': 'One note shared by the whole group. The agent can append after running commands.',
      'group.missingCredential': 'A host is missing a credential',
      'group.form.newTitle': 'New connection group',
      'group.form.editTitle': 'Edit connection group',
      'group.form.name': 'Group name',
      'group.form.namePlaceholder': 'e.g. Production cluster',
      'group.form.note': 'Shared note',
      'group.form.notePlaceholder': 'What is this group for? e.g. Production cluster with three web nodes.',
      'group.form.noteHint': 'Shared by the whole group and visible to the model. Do not put passwords, keys, or tokens in it.',
      'group.form.warningModel': 'After saving, the agent can run commands on the hosts in this group.',
      'host.test': 'Test',
      'host.testing': 'Testing…',
      'host.edit': 'Edit',
      'host.delete': 'Delete',
      'host.confirmDelete': 'Confirm delete',
      'host.cancel': 'Cancel',
      'host.credentialMissing': 'Credential missing',
      'host.form.newTitle': 'Add host',
      'host.form.editTitle': 'Edit host',
      'host.form.label': 'Host label',
      'host.form.labelPlaceholder': 'e.g. node1',
      'host.form.labelRequired': 'Host label is required.',
      'host.form.warningModel': 'After saving, the agent can run commands on this host.',
      'form.elevation': 'Elevation',
      'form.elevationNone': 'None',
      'form.elevationSudo': 'sudo',
      'form.elevationSudoI': 'sudo su - (sudo -i)',
      'form.elevationPassword': 'Elevation password (optional)',
      'form.elevationPasswordPlaceholder': 'Fill in when sudo needs a password; leave empty for passwordless sudo',
      'form.elevationHint': 'The model only sets root=true; the plugin applies the method configured here.',
      'form.transport': 'Connection type',
      'form.transportSsh': 'Standard SSH',
      'form.transportSangfor': 'Sangfor bastion',
      'form.bastionHint': 'In bastion mode, the address/port/user above are the bastion entry point; the password or key logs in to the bastion. The target asset is selected by its menu number.',
      'form.bastionPreset': 'Saved bastion',
      'form.bastionPresetManual': 'Enter a new bastion manually',
      'form.bastionPresetHint': 'Choosing a saved bastion fills its address/port/user and reuses its login credentials, so the password does not need to be entered again.',
      'form.bastionPresetReuseHint': 'The selected bastion login is reused; no password or private key is needed here.',
      'form.bastionAddress': 'Bastion address',
      'form.bastionUser': 'Bastion login user',
      'form.asset': 'Asset number',
      'form.assetPlaceholder': 'Menu number, for example 10',
      'form.assetIp': 'Asset IP',
      'form.assetIpPlaceholder': 'Enter an IP, for example 192.0.2.81',
      'form.assetIpRequired': 'Enter the asset IP.',
      'form.assetIpInvalid': 'Enter a complete IPv4 address, for example 192.0.2.81.',
      'form.assetSearchHint': 'Type an IP to search the bastion in real time; connections use g <IP> and pick the first match.',
      'form.assetSearching': 'Searching…',
      'form.assetNoResults': 'No matching assets',
      'form.assetSearchUnavailable': 'This group has no usable bastion host yet; save the host first, then search from its edit form.',
      'form.assetSearchUsing': 'Searching via {name}',
      'form.assetPage': 'Asset page',
      'form.assetInvalid': 'Enter the numeric asset number from the menu.',
      'form.assetPageInvalid': 'Asset page must be a positive integer.',
      'form.targetUsernameRequired': 'Enter a target username when using the $user account.',
      'form.account': 'Default account',
      'form.accountRoot': 'root',
      'form.accountUser': '$user',
      'form.targetUsername': 'Target username (for $user)',
      'form.targetUsernamePlaceholder': 'For example user1',
      'form.targetPassword': 'Target password (optional)',
      'form.targetPasswordPlaceholder': 'Fill in when the bastion asks for a target password; leave empty to keep the saved value',
      'host.sangforBadge': 'Bastion',
      'toast.groupSaved': 'Connection group saved',
      'toast.groupDeleted': 'Connection group deleted',
      'toast.hostSaved': 'Host saved',
      'toast.hostDeleted': 'Host deleted',
    }

    const CSS = `
.rssh-page{height:100%;overflow:auto;padding:28px 32px 56px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);box-sizing:border-box}
.rssh-inner{max-width:880px;margin:0 auto}
.rssh-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:22px}
.rssh-title{margin:0;font-size:22px;line-height:30px;font-weight:650;letter-spacing:-.01em}
.rssh-subtitle{margin:6px 0 0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);max-width:620px}
.rssh-header-actions{display:flex;align-items:center;gap:8px;flex:none}
.rssh-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:18px;padding:6px 12px;cursor:pointer;white-space:nowrap}
.rssh-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.rssh-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.rssh-btn:disabled{opacity:.55;cursor:default}
.rssh-btn-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.rssh-btn-primary:hover:not(:disabled){background:var(--dsw-alias-brand-primary);opacity:.9}
.rssh-btn-danger{color:var(--dsw-alias-state-error-primary);border-color:transparent;background:transparent}
.rssh-btn-danger:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.rssh-banner{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:12.5px;line-height:19px;color:var(--dsw-alias-state-error-primary)}
.rssh-banner-close{flex:none;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;opacity:.8}
.rssh-loading,.rssh-muted{color:var(--dsw-alias-label-secondary)}
.rssh-loading{font-size:13px;padding:24px 0}
.rssh-empty{border:1px dashed var(--dsw-alias-border-l2);border-radius:14px;padding:52px 24px;text-align:center;background:var(--dsw-alias-bg-layer-1)}
.rssh-empty-title{font-size:16px;font-weight:600;margin:0 0 8px}
.rssh-empty-body{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);margin:0 auto 18px;max-width:520px}
.rssh-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:18px;margin-bottom:12px}
.rssh-card-collapsed{padding:14px 18px}
.rssh-card-collapsed > :not(.rssh-card-head){display:none}
.rssh-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;cursor:pointer;user-select:none;border-radius:8px;margin:-4px;padding:4px}
.rssh-card-head:hover{background:var(--dsw-alias-bg-layer-2)}
.rssh-card-head:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.rssh-card-toggle{flex:none;width:18px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:22px}
.rssh-card-name{font-size:15px;line-height:22px;font-weight:600;margin:0}
.rssh-card-host{font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary);margin-top:3px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;word-break:break-all}
.rssh-badge{flex:none;display:inline-flex;align-items:center;gap:5px;font-size:11px;line-height:16px;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.rssh-badge-warn{color:var(--dsw-alias-state-warn-primary)}
.rssh-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-top:10px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.rssh-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;word-break:break-all}
.rssh-note{margin-top:12px;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-size:12.5px;line-height:19px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:150px;overflow:auto}
.rssh-note-empty{color:var(--dsw-alias-label-secondary);font-style:normal}
.rssh-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:14px}
.rssh-btn-small{padding:4px 9px;font-size:12px}
.rssh-hosts{margin-top:12px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:10px}
.rssh-hosts-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}
.rssh-hosts-title{font-size:12px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-secondary)}
.rssh-host-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.rssh-host-row:last-of-type{border-bottom:0}
.rssh-host-main{flex:1;min-width:220px}
.rssh-host-label{font-size:13px;line-height:19px;font-weight:600;overflow-wrap:anywhere}
.rssh-host-target{font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}
.rssh-host-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.rssh-host-actions .rssh-btn{padding:4px 8px;font-size:12px}
.rssh-host-row .rssh-test{margin-left:0;flex-basis:100%;max-width:100%}
.rssh-host-empty{padding:12px 0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary)}
.rssh-test{margin-left:auto;font-size:11.5px;line-height:17px;max-width:52%}
.rssh-test-ok{color:var(--dsw-alias-state-success-primary)}
.rssh-test-error{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}
.rssh-footnote{margin-top:22px;font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.rssh-modal-overlay{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.45);box-sizing:border-box}
.rssh-modal{width:620px;max-width:100%;max-height:calc(100vh - 48px);overflow:auto;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.28);box-sizing:border-box}
.rssh-modal-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px 0}
.rssh-modal-title{margin:0;font-size:16px;line-height:24px;font-weight:650}
.rssh-modal-body{padding:16px 20px 4px}
.rssh-modal-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:14px 20px 18px;border-top:1px solid var(--dsw-alias-border-l1);margin-top:16px}
.rssh-field{display:block;margin-bottom:14px}
.rssh-label{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:12px;line-height:18px;font-weight:550;color:var(--dsw-alias-label-primary);margin-bottom:5px}
.rssh-hint{font-size:11px;line-height:17px;font-weight:400;color:var(--dsw-alias-label-secondary)}
.rssh-input,.rssh-textarea{display:block;width:100%;box-sizing:border-box;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:19px;padding:7px 9px}
.rssh-select-wrap{position:relative}
.rssh-select-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;box-sizing:border-box;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:19px;padding:7px 9px;text-align:left;cursor:pointer}
.rssh-select-trigger:hover{background:var(--dsw-alias-bg-layer-2)}
.rssh-select-trigger:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px;border-color:transparent}
.rssh-select-value{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rssh-select-chevron{flex:none;color:var(--dsw-alias-label-secondary)}
.rssh-select-menu{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:20;box-sizing:border-box;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;box-shadow:0 8px 26px rgba(0,0,0,.28);padding:4px;max-height:220px;overflow:auto}
.rssh-select-option{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;box-sizing:border-box;text-align:left;background:transparent;border:0;border-radius:6px;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:19px;padding:6px 8px;cursor:pointer}
.rssh-select-option:hover,.rssh-select-option:focus-visible{background:var(--dsw-alias-bg-layer-2);outline:none}
.rssh-select-option.is-selected{color:var(--dsw-alias-brand-primary);font-weight:600}
.rssh-select-check{flex:none;color:var(--dsw-alias-brand-primary)}
.rssh-asset-menu{position:absolute;left:0;right:0;top:calc(100% - 2px);z-index:40;box-sizing:border-box;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;box-shadow:0 8px 26px rgba(0,0,0,.28);padding:4px;max-height:240px;overflow:auto}
.rssh-asset-option{display:flex;align-items:baseline;gap:8px;width:100%;box-sizing:border-box;text-align:left;background:transparent;border:0;border-radius:6px;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:18px;padding:6px 8px;cursor:pointer}
.rssh-asset-option:hover,.rssh-asset-option:focus-visible{background:var(--dsw-alias-bg-layer-2);outline:none}
.rssh-asset-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rssh-asset-empty{padding:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.rssh-asset-error{color:var(--dsw-alias-state-error-primary)}
.rssh-input:focus,.rssh-textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px;border-color:transparent}
.rssh-textarea{resize:vertical;min-height:76px}
.rssh-textarea-key{min-height:128px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:18px;white-space:pre;overflow-wrap:normal;overflow-x:auto}
.rssh-row{display:grid;grid-template-columns:1fr 120px;gap:12px}
.rssh-inline{display:flex;align-items:center;gap:8px}
.rssh-inline .rssh-btn{padding:6px 9px}
.rssh-check{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:19px;margin:4px 0 14px;cursor:pointer}
.rssh-check input{margin:3px 0 0;accent-color:var(--dsw-alias-brand-primary)}
.rssh-error{border:1px solid var(--dsw-alias-state-error-primary);border-radius:8px;padding:8px 10px;margin:2px 0 14px;color:var(--dsw-alias-state-error-primary);font-size:12.5px;line-height:19px;overflow-wrap:anywhere}
.rssh-note-box{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:9px 11px;background:var(--dsw-alias-bg-layer-2);font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-secondary);margin-bottom:14px}
.rssh-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:1300;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:9px 16px;font-size:12.5px;line-height:19px;box-shadow:0 8px 26px rgba(0,0,0,.2);max-width:80vw}
.rssh-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (max-width:720px){.rssh-page{padding:20px 16px 40px}.rssh-header{flex-direction:column;gap:14px}.rssh-row{grid-template-columns:1fr}.rssh-test{max-width:100%;margin-left:0;flex-basis:100%}}
`

    function errorText(error) {
      return error instanceof Error && error.message ? error.message : String(error)
    }

    async function api(path, options = {}) {
      const base = typeof document !== 'undefined' ? document.baseURI : 'http://localhost/'
      const url = new URL(`${API_ROOT}${path}`, base).toString()
      const method = options.method || 'GET'
      const headers = { accept: 'application/json' }
      const init = { method, headers, credentials: 'same-origin' }
      if (options.body !== undefined) {
        headers['content-type'] = 'application/json'
        init.body = options.body
      }
      const response = await fetch(url, init)
      let data = null
      try {
        data = await response.json()
      } catch {}
      if (!response.ok) {
        throw new Error(data?.error?.message || `请求失败（HTTP ${response.status}）`)
      }
      if (!data || data.ok !== true) {
        throw new Error(data?.error?.message || '请求失败')
      }
      return data
    }

    function authLabel(t, authType) {
      return authType === 'privateKey' ? t('auth.privateKey') : t('auth.password')
    }

    function formatTime(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleString()
    }

    function hostCount(t, count) {
      return count === 1 ? t('group.hostCountOne') : t('group.hostCount').replace('{n}', String(count))
    }

    function useLocaleTick(ctx) {
      const [, setTick] = useState(0)
      useEffect(() => {
        return ctx.locale.subscribe(() => setTick((value) => value + 1))
      }, [ctx])
    }

    function SidebarIcon({ size, active }) {
      const color = active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)'
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('rect', { x: 3.2, y: 4.2, width: 17.6, height: 15.6, rx: 3, stroke: color, strokeWidth: 1.6 }),
        h('path', { d: 'M3.2 8.8h17.6', stroke: color, strokeWidth: 1.6 }),
        h('circle', { cx: 6.4, cy: 6.5, r: 0.9, fill: color }),
        h('path', {
          d: 'M7.6 12.6l2.1 1.9-2.1 1.9',
          stroke: color,
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M12.4 16.4h4.6', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' }),
      )
    }

    function TestResult({ state, t }) {
      if (!state || state.phase === 'busy') return null
      if (state.phase === 'ok') {
        return h(
          'span',
          { className: 'rssh-test rssh-test-ok' },
          `✓ ${t('test.success')} · ${state.latencyMs} ms${state.hostKey ? ` · ${state.hostKey}` : ''}`,
        )
      }
      if (state.phase === 'error') {
        return h('span', { className: 'rssh-test rssh-test-error' }, `✗ ${state.message || t('test.failure')}`)
      }
      return null
    }

    function ConnectionCard({ profile, t, busy, test, confirming, onTest, onEdit, onDelete, onCopy }) {
      const note = profile.note
        ? h('div', { className: 'rssh-note' }, profile.note)
        : h('div', { className: 'rssh-note rssh-note-empty' }, t('card.noteEmpty'))
      return h(
        'article',
        { className: 'rssh-card' },
        h(
          'div',
          { className: 'rssh-card-head' },
          h(
            'div',
            { style: { minWidth: 0 } },
            h('h2', { className: 'rssh-card-name' }, profile.name),
            h(
              'div',
              { className: 'rssh-card-host' },
              `${profile.username}@${profile.host}:${profile.port}`,
            ),
          ),
          h(
            'div',
            { style: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' } },
            h('span', { className: 'rssh-badge' }, authLabel(t, profile.authType)),
            profile.credentialConfigured
              ? null
              : h('span', { className: 'rssh-badge rssh-badge-warn' }, t('card.credentialMissing')),
          ),
        ),
        h(
          'div',
          { className: 'rssh-meta' },
          h('span', null, `${t('card.idLabel')}: `, h('span', { className: 'rssh-mono' }, profile.id)),
          h('span', null, `· ${formatTime(profile.updatedAt)}`),
          profile.hostKey ? h('span', { className: 'rssh-mono', title: profile.hostKey }, profile.hostKey) : null,
        ),
        note,
        h(
          'div',
          { className: 'rssh-actions' },
          h(
            'button',
            { type: 'button', className: 'rssh-btn', disabled: busy, onClick: () => onTest(profile.id) },
            busy ? t('card.testing') : t('card.test'),
          ),
          h('button', { type: 'button', className: 'rssh-btn', disabled: busy, onClick: () => onEdit(profile) }, t('card.edit')),
          h(
            'button',
            { type: 'button', className: 'rssh-btn', disabled: busy, onClick: () => onCopy(profile.id) },
            t('card.copyId'),
          ),
          confirming
            ? h(
                React.Fragment,
                null,
                h(
                  'button',
                  { type: 'button', className: 'rssh-btn rssh-btn-danger', disabled: busy, onClick: () => onDelete(profile.id) },
                  t('card.confirmDelete'),
                ),
                h(
                  'button',
                  { type: 'button', className: 'rssh-btn', disabled: busy, onClick: () => onDelete(profile.id, true) },
                  t('card.cancel'),
                ),
              )
            : h(
                'button',
                { type: 'button', className: 'rssh-btn rssh-btn-danger', disabled: busy, onClick: () => onDelete(profile.id) },
                t('card.delete'),
              ),
          h(TestResult, { state: test, t }),
        ),
      )
    }

    function Select({ id, labelledBy, value, options, onChange }) {
      const [open, setOpen] = useState(false)
      const [activeIndex, setActiveIndex] = useState(-1)
      const rootRef = useRef(null)
      const triggerRef = useRef(null)
      const optionRefs = useRef([])
      const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
      const current = options.find((option) => option.value === value) ?? options[0]

      const close = (focusTrigger) => {
        setOpen(false)
        setActiveIndex(-1)
        if (focusTrigger) triggerRef.current?.focus()
      }

      const openMenu = () => {
        setOpen(true)
        setActiveIndex(selectedIndex)
      }

      const moveActive = (delta) => {
        setActiveIndex((currentIndex) => {
          const base = currentIndex < 0 ? selectedIndex : currentIndex
          return (base + delta + options.length) % options.length
        })
      }

      const choose = (index) => {
        const option = options[index]
        if (!option) return
        onChange(option.value)
        close(true)
      }

      useEffect(() => {
        if (!open) return
        const onDocumentMouseDown = (event) => {
          if (!rootRef.current?.contains(event.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onDocumentMouseDown)
        return () => document.removeEventListener('mousedown', onDocumentMouseDown)
      }, [open])

      useEffect(() => {
        if (open && activeIndex >= 0) optionRefs.current[activeIndex]?.focus()
      }, [open, activeIndex])

      const onTriggerKeyDown = (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          if (!open) openMenu()
          else moveActive(event.key === 'ArrowDown' ? 1 : -1)
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (open) choose(activeIndex)
          else openMenu()
          return
        }
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          event.stopPropagation()
          close(true)
        }
      }

      const onOptionKeyDown = (event, index) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          moveActive(1)
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          moveActive(-1)
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          choose(index)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          close(true)
        } else if (event.key === 'Tab') {
          close(false)
        }
      }

      return h(
        'div',
        { className: 'rssh-select-wrap', ref: rootRef },
        h(
          'button',
          {
            id,
            ref: triggerRef,
            type: 'button',
            className: 'rssh-select-trigger',
            role: 'combobox',
            'aria-haspopup': 'listbox',
            'aria-expanded': open,
            'aria-controls': `${id}-menu`,
            'aria-labelledby': labelledBy,
            onClick: () => (open ? close(true) : openMenu()),
            onKeyDown: onTriggerKeyDown,
          },
          h('span', { className: 'rssh-select-value' }, current?.label ?? ''),
          h(
            'svg',
            {
              className: 'rssh-select-chevron',
              width: 12,
              height: 12,
              viewBox: '0 0 12 12',
              'aria-hidden': true,
            },
            h('path', {
              d: 'M2.5 4.5 6 8l3.5-3.5',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }),
          ),
        ),
        open
          ? h(
              'div',
              { id: `${id}-menu`, className: 'rssh-select-menu', role: 'listbox', 'aria-labelledby': labelledBy },
              options.map((option, index) =>
                h(
                  'button',
                  {
                    key: option.value,
                    ref: (element) => {
                      optionRefs.current[index] = element
                    },
                    type: 'button',
                    className: `rssh-select-option${option.value === value ? ' is-selected' : ''}`,
                    role: 'option',
                    'aria-selected': option.value === value,
                    tabIndex: -1,
                    onClick: () => choose(index),
                    onKeyDown: (event) => onOptionKeyDown(event, index),
                  },
                  h('span', null, option.label),
                  option.value === value ? h('span', { className: 'rssh-select-check', 'aria-hidden': true }, '✓') : null,
                ),
              ),
            )
          : null,
      )
    }

    function ConnectionForm({ t, profile, onClose, onSaved }) {
      const isEdit = Boolean(profile)
      const [form, setForm] = useState(() => ({
        name: profile?.name ?? '',
        host: profile?.host ?? '',
        port: String(profile?.port ?? 22),
        username: profile?.username ?? '',
        authType: profile?.authType ?? 'password',
        password: '',
        privateKey: '',
        passphrase: '',
        note: profile?.note ?? '',
        resetHostKey: false,
      }))
      const [showPassword, setShowPassword] = useState(false)
      const [saving, setSaving] = useState(false)
      const [error, setError] = useState('')
      const firstInput = useRef(null)
      const dialogRef = useRef(null)
      const keyFileRef = useRef(null)

      const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

      useEffect(() => {
        firstInput.current?.focus()
      }, [])

      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
            return
          }
          if (event.key !== 'Tab') return
          const root = dialogRef.current
          if (!root) return
          const focusable = Array.from(
            root.querySelectorAll(
              'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
          if (focusable.length === 0) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
            event.preventDefault()
            first.focus()
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])

      const submit = async (event) => {
        event.preventDefault()
        if (saving) return
        setError('')
        if (!form.name.trim()) return setError(t('form.nameRequired'))
        if (!form.host.trim()) return setError(t('form.hostRequired'))
        if (!form.username.trim()) return setError(t('form.usernameRequired'))
        const port = Number(form.port)
        if (!Number.isInteger(port) || port < 1 || port > 65535) return setError(t('form.portInvalid'))
        const authChanged = isEdit && form.authType !== profile.authType
        const needsSecret = !isEdit || authChanged || profile.credentialConfigured === false
        if (form.authType === 'password') {
          if (needsSecret && !form.password) {
            return setError(isEdit ? t('form.secretRequired') : t('form.secretRequiredNew'))
          }
        } else if (needsSecret && !form.privateKey.trim()) {
          return setError(isEdit ? t('form.secretRequired') : t('form.secretRequiredNew'))
        }
        const payload = {
          name: form.name,
          host: form.host,
          port,
          username: form.username,
          authType: form.authType,
          note: form.note,
        }
        if (form.authType === 'password') {
          if (form.password) payload.password = form.password
        } else {
          if (form.privateKey.trim()) payload.privateKey = form.privateKey
          if (form.passphrase) payload.passphrase = form.passphrase
        }
        if (isEdit && form.resetHostKey) payload.resetHostKey = true
        setSaving(true)
        try {
          const data = isEdit
            ? await api(`/profiles/${encodeURIComponent(profile.id)}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
              })
            : await api('/profiles', { method: 'POST', body: JSON.stringify(payload) })
          onSaved(data.profile)
        } catch (submitError) {
          setError(errorText(submitError))
        } finally {
          setSaving(false)
        }
      }

      // Typing a new password or key means the stored credential is being replaced.
      const secretHint = isEdit && profile.credentialConfigured === false
        ? t('form.secretMissing')
        : isEdit && !form.password && !form.privateKey
          ? t('form.secretKeep')
          : null

      return h(
        'div',
        {
          className: 'rssh-modal-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        },
        h(
          'div',
          { className: 'rssh-modal', ref: dialogRef, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rssh-modal-title' },
          h(
            'div',
            { className: 'rssh-modal-head' },
            h('h2', { id: 'rssh-modal-title', className: 'rssh-modal-title' }, isEdit ? t('form.editTitle') : t('form.newTitle')),
            h(
              'button',
              { type: 'button', className: 'rssh-btn', onClick: onClose, 'aria-label': t('form.close') },
              '×',
            ),
          ),
          h(
            'form',
            { onSubmit: submit },
            h(
              'div',
              { className: 'rssh-modal-body' },
              error ? h('div', { className: 'rssh-error', role: 'alert' }, error) : null,
              h(
                'label',
                { className: 'rssh-field' },
                h('span', { className: 'rssh-label' }, t('form.name')),
                h('input', {
                  ref: firstInput,
                  className: 'rssh-input',
                  value: form.name,
                  placeholder: t('form.namePlaceholder'),
                  maxLength: 80,
                  onChange: (event) => set('name', event.target.value),
                }),
              ),
              h(
                'div',
                { className: 'rssh-row' },
                h(
                  'label',
                  { className: 'rssh-field' },
                  h('span', { className: 'rssh-label' }, t('form.host')),
                  h('input', {
                    className: 'rssh-input',
                    value: form.host,
                    placeholder: t('form.hostPlaceholder'),
                    maxLength: 255,
                    onChange: (event) => set('host', event.target.value),
                  }),
                ),
                h(
                  'label',
                  { className: 'rssh-field' },
                  h('span', { className: 'rssh-label' }, t('form.port')),
                  h('input', {
                    className: 'rssh-input',
                    type: 'number',
                    min: 1,
                    max: 65535,
                    value: form.port,
                    onChange: (event) => set('port', event.target.value),
                  }),
                ),
              ),
              h(
                'label',
                { className: 'rssh-field' },
                h('span', { className: 'rssh-label' }, t('form.username')),
                h('input', {
                  className: 'rssh-input',
                  value: form.username,
                  maxLength: 128,
                  onChange: (event) => set('username', event.target.value),
                }),
              ),
              h(
                'div',
                { className: 'rssh-field' },
                h('label', { id: 'rssh-auth-label', className: 'rssh-label', htmlFor: 'rssh-auth' }, t('form.authType')),
                h(Select, {
                  id: 'rssh-auth',
                  labelledBy: 'rssh-auth-label',
                  value: form.authType,
                  options: [
                    { value: 'password', label: t('auth.password') },
                    { value: 'privateKey', label: t('auth.privateKey') },
                  ],
                  onChange: (value) => set('authType', value),
                }),
              ),
              form.authType === 'password'
                ? h(
                    'div',
                    { className: 'rssh-field' },
                    h(
                      'label',
                      { className: 'rssh-label', htmlFor: 'rssh-password' },
                      h('span', null, t('form.password')),
                      secretHint ? h('span', { className: 'rssh-hint' }, secretHint) : null,
                    ),
                    h(
                      'div',
                      { className: 'rssh-inline' },
                      h('input', {
                        id: 'rssh-password',
                        className: 'rssh-input',
                        type: showPassword ? 'text' : 'password',
                        autoComplete: 'new-password',
                        value: form.password,
                        placeholder: isEdit ? t('form.secretKeep') : t('form.passwordPlaceholder'),
                        onChange: (event) => set('password', event.target.value),
                      }),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'rssh-btn',
                          onClick: () => setShowPassword((value) => !value),
                        },
                        showPassword ? t('form.hide') : t('form.show'),
                      ),
                    ),
                  )
                : h(
                    React.Fragment,
                    null,
                    h(
                      'div',
                      { className: 'rssh-field' },
                      h(
                        'label',
                        { className: 'rssh-label', htmlFor: 'rssh-private-key' },
                        h('span', null, t('form.privateKey')),
                        secretHint ? h('span', { className: 'rssh-hint' }, secretHint) : null,
                      ),
                      h('textarea', {
                        id: 'rssh-private-key',
                        className: 'rssh-textarea rssh-textarea-key',
                        value: form.privateKey,
                        placeholder: isEdit ? t('form.secretKeep') : t('form.privateKeyPlaceholder'),
                        spellCheck: false,
                        onChange: (event) => set('privateKey', event.target.value),
                      }),
                      h('input', {
                        ref: keyFileRef,
                        type: 'file',
                        accept: '.pem,.key,.txt,text/plain',
                        style: { display: 'none' },
                        onChange: async (event) => {
                          const file = event.target.files?.[0]
                          event.target.value = ''
                          if (!file) return
                          try {
                            set('privateKey', await file.text())
                          } catch {}
                        },
                      }),
                      h(
                        'div',
                        { style: { marginTop: 7 } },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'rssh-btn',
                            onClick: () => keyFileRef.current?.click(),
                          },
                          t('form.chooseFile'),
                        ),
                      ),
                      h('span', { className: 'rssh-hint', style: { display: 'block', marginTop: 5 } }, t('form.privateKeyHint')),
                    ),
                    h(
                      'label',
                      { className: 'rssh-field' },
                      h('span', { className: 'rssh-label' }, t('form.passphrase')),
                      h('input', {
                        className: 'rssh-input',
                        type: 'password',
                        autoComplete: 'new-password',
                        value: form.passphrase,
                        placeholder: t('form.passphrasePlaceholder'),
                        onChange: (event) => set('passphrase', event.target.value),
                      }),
                    ),
                  ),
              isEdit && profile.hostKey
                ? h(
                    'div',
                    { className: 'rssh-note-box' },
                    h('div', { className: 'rssh-label' }, t('form.hostKey')),
                    h('div', { className: 'rssh-mono' }, profile.hostKey),
                    h('div', { style: { marginTop: 6 } }, t('form.hostKeyHint')),
                    h(
                      'label',
                      { className: 'rssh-check' },
                      h('input', {
                        type: 'checkbox',
                        checked: form.resetHostKey,
                        onChange: (event) => set('resetHostKey', event.target.checked),
                      }),
                      h('span', null, t('form.resetHostKey'), h('span', { className: 'rssh-hint', style: { display: 'block' } }, t('form.resetHostKeyHint'))),
                    ),
                  )
                : h('div', { className: 'rssh-note-box' }, t('form.hostKeyHint')),
              h(
                'label',
                { className: 'rssh-field' },
                h('span', { className: 'rssh-label' }, t('form.note')),
                h('textarea', {
                  className: 'rssh-textarea',
                  value: form.note,
                  placeholder: t('form.notePlaceholder'),
                  maxLength: 20000,
                  onChange: (event) => set('note', event.target.value),
                }),
                h('span', { className: 'rssh-hint', style: { display: 'block', marginTop: 5 } }, t('form.noteHint')),
              ),
              h('div', { className: 'rssh-note-box' }, t('form.warningModel')),
            ),
            h(
              'div',
              { className: 'rssh-modal-foot' },
              h('button', { type: 'button', className: 'rssh-btn', onClick: onClose, disabled: saving }, t('form.cancel')),
              h('button', { type: 'submit', className: 'rssh-btn rssh-btn-primary', disabled: saving }, saving ? t('form.saving') : t('form.save')),
            ),
          ),
        ),
      )
    }

    function HostRow({ host, t, testing, busy, test, confirming, onTest, onEdit, onDelete, onCancelDelete }) {
      return h(
        'div',
        { className: 'rssh-host-row' },
        h(
          'div',
          { className: 'rssh-host-main' },
          h('div', { className: 'rssh-host-label' }, host.label),
          h(
            'div',
            { className: 'rssh-host-target' },
            `${host.username}@${host.host}:${host.port} · ${authLabel(t, host.authType)}`,
          ),
          host.transport === 'sangfor'
            ? h(
                'span',
                { className: 'rssh-badge', style: { marginTop: 4, marginRight: 6 } },
                `${t('host.sangforBadge')} · ${host.asset} · ${host.account}`,
              )
            : host.elevation && host.elevation !== 'none'
              ? h(
                  'span',
                  { className: 'rssh-badge', style: { marginTop: 4, marginRight: 6 } },
                  `root: ${host.elevation === 'sudo-i' ? 'sudo su -' : 'sudo'}`,
                )
              : null,
          host.credentialConfigured
            ? null
            : h('span', { className: 'rssh-badge rssh-badge-warn', style: { marginTop: 4 } }, t('host.credentialMissing')),
        ),
        h(
          'div',
          { className: 'rssh-host-actions' },
          h(
            'button',
            { type: 'button', className: 'rssh-btn', disabled: testing || busy, onClick: onTest },
            testing ? t('host.testing') : t('host.test'),
          ),
          h('button', { type: 'button', className: 'rssh-btn', disabled: busy, onClick: onEdit }, t('host.edit')),
          confirming
            ? h(
                React.Fragment,
                null,
                h(
                  'button',
                  { type: 'button', className: 'rssh-btn rssh-btn-danger', disabled: busy, onClick: onDelete },
                  t('host.confirmDelete'),
                ),
                h('button', { type: 'button', className: 'rssh-btn', disabled: busy, onClick: onCancelDelete }, t('host.cancel')),
              )
            : h(
                'button',
                { type: 'button', className: 'rssh-btn rssh-btn-danger', disabled: busy, onClick: onDelete },
                t('host.delete'),
              ),
        ),
        test ? h(TestResult, { state: test, t }) : null,
      )
    }

    function GroupCard({
      group,
      t,
      busyId,
      groupTestBusy,
      tests,
      confirmingGroup,
      confirmingHost,
      onTestHost,
      onEditHost,
      onDeleteHost,
      onCancelDeleteHost,
      onAddHost,
      onEditGroup,
      onDeleteGroup,
      onCancelDeleteGroup,
      onCopy,
      onTestGroup,
    }) {
      const missing = group.hosts.some((host) => !host.credentialConfigured)
      const groupBusy = Boolean(busyId) || Boolean(groupTestBusy)
      const testingAll = groupTestBusy === group.id
      const [expanded, setExpanded] = useState(false)
      const toggle = () => setExpanded((value) => !value)
      return h(
        'article',
        { className: `rssh-card${expanded ? '' : ' rssh-card-collapsed'}` },
        h(
          'div',
          {
            className: 'rssh-card-head',
            role: 'button',
            tabIndex: 0,
            'aria-expanded': expanded,
            'aria-label': `${group.name} · ${hostCount(t, group.hosts.length)} · ${group.id} · ${expanded ? t('group.collapse') : t('group.expand')}`,
            onClick: toggle,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                toggle()
              }
            },
          },
          h(
            'div',
            { style: { minWidth: 0 } },
            h('h2', { className: 'rssh-card-name' }, group.name),
            h('div', { className: 'rssh-card-host' }, `${hostCount(t, group.hosts.length)} · ${group.id}`),
          ),
          h(
            'div',
            { style: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' } },
            expanded ? h('span', { className: 'rssh-badge' }, hostCount(t, group.hosts.length)) : null,
            expanded && missing
              ? h('span', { className: 'rssh-badge rssh-badge-warn' }, t('group.missingCredential'))
              : null,
            h('span', { className: 'rssh-card-toggle', 'aria-hidden': 'true' }, expanded ? '▾' : '▸'),
          ),
        ),
        h(
          'div',
          { className: 'rssh-meta' },
          h('span', null, `${t('group.idLabel')}: `, h('span', { className: 'rssh-mono' }, group.id)),
          h('span', null, `· ${formatTime(group.updatedAt)}`),
        ),
        group.note
          ? h('div', { className: 'rssh-note' }, group.note)
          : h('div', { className: 'rssh-note rssh-note-empty' }, t('group.noteEmpty')),
        h(
          'div',
          { className: 'rssh-hosts' },
          h(
            'div',
            { className: 'rssh-hosts-head' },
            h('span', { className: 'rssh-hosts-title' }, t('group.hostsTitle')),
            h(
              'button',
              { type: 'button', className: 'rssh-btn rssh-btn-small', disabled: groupBusy, onClick: onAddHost },
              `+ ${t('group.addHost')}`,
            ),
          ),
          group.hosts.length === 0
            ? h('div', { className: 'rssh-host-empty' }, t('group.noHosts'))
            : group.hosts.map((host) =>
                h(HostRow, {
                  key: host.id,
                  host,
                  t,
                  testing: busyId === host.id || testingAll,
                  busy: Boolean(busyId) || Boolean(groupTestBusy),
                  test: tests[host.id],
                  confirming: confirmingHost === `${group.id}:${host.id}`,
                  onTest: () => onTestHost(group.id, host.id),
                  onEdit: () => onEditHost(group, host),
                  onDelete: () => onDeleteHost(group.id, host.id),
                  onCancelDelete: () => onCancelDeleteHost(group.id, host.id),
                }),
              ),
        ),
        h(
          'div',
          { className: 'rssh-actions' },
          h('button', { type: 'button', className: 'rssh-btn', disabled: groupBusy, onClick: () => onEditGroup(group) }, t('group.edit')),
          h('button', { type: 'button', className: 'rssh-btn', disabled: groupBusy, onClick: () => onCopy(group.id) }, t('group.copyId')),
          h(
            'button',
            {
              type: 'button',
              className: 'rssh-btn',
              disabled: groupBusy || group.hosts.length === 0,
              onClick: () => onTestGroup(group),
            },
            testingAll ? t('group.testingAll') : t('group.testAll'),
          ),
          confirmingGroup === group.id
            ? h(
                React.Fragment,
                null,
                h(
                  'button',
                  { type: 'button', className: 'rssh-btn rssh-btn-danger', disabled: groupBusy, onClick: () => onDeleteGroup(group.id) },
                  t('group.confirmDelete'),
                ),
                h('button', { type: 'button', className: 'rssh-btn', disabled: groupBusy, onClick: onCancelDeleteGroup }, t('host.cancel')),
              )
            : h(
                'button',
                { type: 'button', className: 'rssh-btn rssh-btn-danger', disabled: groupBusy, onClick: () => onDeleteGroup(group.id) },
                t('group.delete'),
              ),
        ),
      )
    }

    function GroupForm({ t, group, onClose, onSaved }) {
      const isEdit = Boolean(group)
      const [form, setForm] = useState(() => ({
        name: group?.name ?? '',
        note: group?.note ?? '',
      }))
      const [saving, setSaving] = useState(false)
      const [error, setError] = useState('')
      const firstInput = useRef(null)
      const dialogRef = useRef(null)

      const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

      useEffect(() => {
        firstInput.current?.focus()
      }, [])

      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
            return
          }
          if (event.key !== 'Tab') return
          const root = dialogRef.current
          if (!root) return
          const focusable = Array.from(
            root.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled])'),
          )
          if (focusable.length === 0) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
            event.preventDefault()
            first.focus()
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])

      const submit = async (event) => {
        event.preventDefault()
        if (saving) return
        setError('')
        if (!form.name.trim()) return setError(t('form.nameRequired'))
        setSaving(true)
        try {
          const payload = { name: form.name, note: form.note }
          const data = isEdit
            ? await api(`/profiles/${encodeURIComponent(group.id)}`, { method: 'PUT', body: JSON.stringify(payload) })
            : await api('/profiles', { method: 'POST', body: JSON.stringify(payload) })
          onSaved(data.profile)
        } catch (submitError) {
          setError(errorText(submitError))
        } finally {
          setSaving(false)
        }
      }

      return h(
        'div',
        {
          className: 'rssh-modal-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        },
        h(
          'div',
          { className: 'rssh-modal', ref: dialogRef, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rssh-group-modal-title' },
          h(
            'div',
            { className: 'rssh-modal-head' },
            h(
              'h2',
              { id: 'rssh-group-modal-title', className: 'rssh-modal-title' },
              isEdit ? t('group.form.editTitle') : t('group.form.newTitle'),
            ),
            h('button', { type: 'button', className: 'rssh-btn', onClick: onClose, 'aria-label': t('form.close') }, '×'),
          ),
          h(
            'form',
            { onSubmit: submit },
            h(
              'div',
              { className: 'rssh-modal-body' },
              error ? h('div', { className: 'rssh-error', role: 'alert' }, error) : null,
              h(
                'label',
                { className: 'rssh-field', htmlFor: 'rssh-group-name' },
                h('span', { className: 'rssh-label' }, t('group.form.name')),
                h('input', {
                  id: 'rssh-group-name',
                  ref: firstInput,
                  className: 'rssh-input',
                  value: form.name,
                  placeholder: t('group.form.namePlaceholder'),
                  maxLength: 80,
                  onChange: (event) => set('name', event.target.value),
                }),
              ),
              h(
                'label',
                { className: 'rssh-field', htmlFor: 'rssh-group-note' },
                h('span', { className: 'rssh-label' }, t('group.form.note')),
                h('textarea', {
                  id: 'rssh-group-note',
                  className: 'rssh-textarea',
                  value: form.note,
                  placeholder: t('group.form.notePlaceholder'),
                  maxLength: 20000,
                  onChange: (event) => set('note', event.target.value),
                }),
                h('span', { className: 'rssh-hint', style: { display: 'block', marginTop: 5 } }, t('group.form.noteHint')),
              ),
              h('div', { className: 'rssh-note-box' }, t('group.form.warningModel')),
            ),
            h(
              'div',
              { className: 'rssh-modal-foot' },
              h('button', { type: 'button', className: 'rssh-btn', onClick: onClose, disabled: saving }, t('form.cancel')),
              h('button', { type: 'submit', className: 'rssh-btn rssh-btn-primary', disabled: saving }, saving ? t('form.saving') : t('form.save')),
            ),
          ),
        ),
      )
    }

    function HostForm({ t, groupId, groupName, host, searchHostId, searchHostLabel, bastionPresets = [], onClose, onSaved }) {
      const isEdit = Boolean(host)
      const [form, setForm] = useState(() => ({
        label: host?.label ?? '',
        host: host?.host ?? '',
        port: String(host?.port ?? 22),
        username: host?.username ?? '',
        authType: host?.authType ?? 'password',
        password: '',
        privateKey: '',
        passphrase: '',
        elevation: host?.elevation ?? 'none',
        elevationPassword: '',
        transport: host?.transport ?? 'ssh',
        assetIp: host?.assetIp ?? '',
        account: host?.account ?? 'root',
        targetUsername: host?.targetUsername ?? '',
        targetPassword: '',
        bastionHostId: '',
        bastionGroupId: '',
        resetHostKey: false,
      }))
      const [showPassword, setShowPassword] = useState(false)
      const [saving, setSaving] = useState(false)
      const [error, setError] = useState('')
      const [assetResults, setAssetResults] = useState([])
      const [assetSearching, setAssetSearching] = useState(false)
      const [assetSearched, setAssetSearched] = useState(false)
      const [assetError, setAssetError] = useState('')
      const [assetOpen, setAssetOpen] = useState(false)
      const firstInput = useRef(null)
      const dialogRef = useRef(null)
      const keyFileRef = useRef(null)
      const skipNextAssetSearch = useRef(false)

      const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
      const reuseBastion = !isEdit && form.transport === 'sangfor' && Boolean(form.bastionHostId)
      const selectedBastionPreset = reuseBastion
        ? bastionPresets.find((preset) => preset.id === form.bastionHostId)
        : null
      const assetSearchHostId = reuseBastion ? form.bastionHostId : searchHostId || ''
      const assetSearchGroupId = reuseBastion ? form.bastionGroupId : groupId
      const assetSearchLabel = reuseBastion ? selectedBastionPreset?.label || '' : searchHostLabel || ''

      useEffect(() => {
        firstInput.current?.focus()
      }, [])

      useEffect(() => {
        if (skipNextAssetSearch.current) {
          skipNextAssetSearch.current = false
          return
        }
        if (form.transport !== 'sangfor' || !assetSearchHostId) {
          setAssetResults([])
          setAssetSearched(false)
          setAssetError('')
          setAssetOpen(false)
          return
        }
        const query = form.assetIp.trim()
        if (!query) {
          setAssetResults([])
          setAssetSearched(false)
          setAssetError('')
          setAssetOpen(false)
          return
        }
        if (!assetOpen) return
        let cancelled = false
        setAssetResults([])
        setAssetSearched(false)
        setAssetError('')
        const timer = setTimeout(async () => {
          if (cancelled) return
          setAssetSearching(true)
          try {
            const data = await api(
              `/profiles/${encodeURIComponent(assetSearchGroupId)}/hosts/${encodeURIComponent(assetSearchHostId)}/sangfor/search`,
              { method: 'POST', body: JSON.stringify({ query }) },
            )
            if (cancelled) return
            setAssetResults(Array.isArray(data.results) ? data.results : [])
            setAssetSearched(true)
            setAssetOpen(true)
          } catch (searchError) {
            if (cancelled) return
            setAssetError(errorText(searchError))
            setAssetSearched(true)
            setAssetOpen(true)
          } finally {
            if (!cancelled) setAssetSearching(false)
          }
        }, 400)
        return () => {
          cancelled = true
          clearTimeout(timer)
        }
      }, [form.transport, form.assetIp, assetSearchGroupId, assetSearchHostId])

      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
            return
          }
          if (event.key !== 'Tab') return
          const root = dialogRef.current
          if (!root) return
          const focusable = Array.from(
            root.querySelectorAll(
              'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
          if (focusable.length === 0) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
            event.preventDefault()
            first.focus()
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])

      const submit = async (event) => {
        event.preventDefault()
        if (saving) return
        setError('')
        if (!form.label.trim()) return setError(t('host.form.labelRequired'))
        if (!form.host.trim()) return setError(t('form.hostRequired'))
        if (!form.username.trim()) return setError(t('form.usernameRequired'))
        const port = Number(form.port)
        if (!Number.isInteger(port) || port < 1 || port > 65535) return setError(t('form.portInvalid'))
        const assetPage = 1
        if (form.transport === 'sangfor') {
          if (!form.assetIp.trim()) return setError(t('form.assetIpRequired'))
          if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(form.assetIp.trim())) return setError(t('form.assetIpInvalid'))
          if (form.account === 'user' && !form.targetUsername.trim()) return setError(t('form.targetUsernameRequired'))
        }
        const authChanged = isEdit && form.authType !== host.authType
        const needsSecret = !reuseBastion && (!isEdit || authChanged || host.credentialConfigured === false)
        if (form.authType === 'password') {
          if (needsSecret && !form.password) {
            return setError(isEdit ? t('form.secretRequired') : t('form.secretRequiredNew'))
          }
        } else if (needsSecret && !form.privateKey.trim()) {
          return setError(isEdit ? t('form.secretRequired') : t('form.secretRequiredNew'))
        }
        const payload = {
          label: form.label,
          host: form.host,
          port,
          username: form.username,
          authType: form.authType,
          elevation: form.elevation,
          transport: form.transport,
          asset: '',
          assetIp: form.transport === 'sangfor' ? form.assetIp.trim() : '',
          assetPage,
          account: form.account,
          targetUsername: form.transport === 'sangfor' ? form.targetUsername.trim() : '',
          bastionHostId: reuseBastion ? form.bastionHostId : '',
        }
        if (form.authType === 'password') {
          if (form.password) payload.password = form.password
        } else {
          if (form.privateKey.trim()) payload.privateKey = form.privateKey
          if (form.passphrase) payload.passphrase = form.passphrase
        }
        if (form.elevationPassword) payload.elevationPassword = form.elevationPassword
        if (form.transport === 'sangfor' && form.targetPassword) payload.targetPassword = form.targetPassword
        if (isEdit && form.resetHostKey) payload.resetHostKey = true
        setSaving(true)
        try {
          const data = isEdit
            ? await api(`/profiles/${encodeURIComponent(groupId)}/hosts/${encodeURIComponent(host.id)}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
              })
            : await api(`/profiles/${encodeURIComponent(groupId)}/hosts`, {
                method: 'POST',
                body: JSON.stringify(payload),
              })
          onSaved(data.profile)
        } catch (submitError) {
          setError(errorText(submitError))
        } finally {
          setSaving(false)
        }
      }

      const secretHint = reuseBastion
        ? t('form.bastionPresetReuseHint')
        : isEdit && host.credentialConfigured === false
          ? t('form.secretMissing')
          : isEdit && !form.password && !form.privateKey
            ? t('form.secretKeep')
            : null

      return h(
        'div',
        {
          className: 'rssh-modal-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        },
        h(
          'div',
          { className: 'rssh-modal', ref: dialogRef, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rssh-host-modal-title' },
          h(
            'div',
            { className: 'rssh-modal-head' },
            h(
              'h2',
              { id: 'rssh-host-modal-title', className: 'rssh-modal-title' },
              `${isEdit ? t('host.form.editTitle') : t('host.form.newTitle')} · ${groupName}`,
            ),
            h('button', { type: 'button', className: 'rssh-btn', onClick: onClose, 'aria-label': t('form.close') }, '×'),
          ),
          h(
            'form',
            { onSubmit: submit },
            h(
              'div',
              { className: 'rssh-modal-body' },
              error ? h('div', { className: 'rssh-error', role: 'alert' }, error) : null,
              h(
                'div',
                { className: 'rssh-field' },
                h('label', { id: 'rssh-host-transport-label', className: 'rssh-label', htmlFor: 'rssh-host-transport' }, t('form.transport')),
                h(Select, {
                  id: 'rssh-host-transport',
                  labelledBy: 'rssh-host-transport-label',
                  value: form.transport,
                  options: [
                    { value: 'ssh', label: t('form.transportSsh') },
                    { value: 'sangfor', label: t('form.transportSangfor') },
                  ],
                  onChange: (value) => set('transport', value),
                }),
              ),
              !isEdit && form.transport === 'sangfor' && bastionPresets.length > 0
                ? h(
                    'div',
                    { className: 'rssh-field' },
                    h(
                      'label',
                      { id: 'rssh-host-bastion-preset-label', className: 'rssh-label', htmlFor: 'rssh-host-bastion-preset' },
                      t('form.bastionPreset'),
                    ),
                    h(Select, {
                      id: 'rssh-host-bastion-preset',
                      labelledBy: 'rssh-host-bastion-preset-label',
                      value: form.bastionHostId,
                      options: [
                        { value: '', label: t('form.bastionPresetManual') },
                        ...bastionPresets.map((preset) => ({ value: preset.id, label: preset.label })),
                      ],
                      onChange: (value) => {
                        if (!value) {
                          setForm((current) => ({ ...current, bastionHostId: '', bastionGroupId: '' }))
                          return
                        }
                        const preset = bastionPresets.find((entry) => entry.id === value)
                        if (!preset) return
                        setForm((current) => ({
                          ...current,
                          bastionHostId: preset.id,
                          bastionGroupId: preset.groupId,
                          host: preset.host,
                          port: String(preset.port),
                          username: preset.username,
                          authType: preset.authType,
                          password: '',
                          privateKey: '',
                          passphrase: '',
                        }))
                      },
                    }),
                    h(
                      'span',
                      { className: 'rssh-hint', style: { display: 'block', marginTop: 5 } },
                      reuseBastion ? t('form.bastionPresetReuseHint') : t('form.bastionPresetHint'),
                    ),
                  )
                : null,
              h(
                'label',
                { className: 'rssh-field', htmlFor: 'rssh-host-label' },
                h('span', { className: 'rssh-label' }, t('host.form.label')),
                h('input', {
                  id: 'rssh-host-label',
                  ref: firstInput,
                  className: 'rssh-input',
                  value: form.label,
                  placeholder: t('host.form.labelPlaceholder'),
                  maxLength: 80,
                  onChange: (event) => set('label', event.target.value),
                }),
              ),
              h(
                'div',
                { className: 'rssh-row' },
                h(
                  'label',
                  { className: 'rssh-field', htmlFor: 'rssh-host-name' },
                  h('span', { className: 'rssh-label' }, form.transport === 'sangfor' ? t('form.bastionAddress') : t('form.host')),
                  h('input', {
                    id: 'rssh-host-name',
                    className: 'rssh-input',
                    value: form.host,
                    placeholder: t('form.hostPlaceholder'),
                    maxLength: 255,
                    disabled: reuseBastion,
                    onChange: (event) => set('host', event.target.value),
                  }),
                ),
                h(
                  'label',
                  { className: 'rssh-field', htmlFor: 'rssh-host-port' },
                  h('span', { className: 'rssh-label' }, t('form.port')),
                  h('input', {
                    id: 'rssh-host-port',
                    className: 'rssh-input',
                    type: 'number',
                    min: 1,
                    max: 65535,
                    value: form.port,
                    disabled: reuseBastion,
                    onChange: (event) => set('port', event.target.value),
                  }),
                ),
              ),
              h(
                'label',
                { className: 'rssh-field', htmlFor: 'rssh-host-user' },
                h('span', { className: 'rssh-label' }, form.transport === 'sangfor' ? t('form.bastionUser') : t('form.username')),
                h('input', {
                  id: 'rssh-host-user',
                  className: 'rssh-input',
                  value: form.username,
                  maxLength: 128,
                  disabled: reuseBastion,
                  onChange: (event) => set('username', event.target.value),
                }),
              ),
              reuseBastion
                ? null
                : h(
                    'div',
                    { className: 'rssh-field' },
                    h('label', { id: 'rssh-host-auth-label', className: 'rssh-label', htmlFor: 'rssh-host-auth' }, t('form.authType')),
                    h(Select, {
                      id: 'rssh-host-auth',
                      labelledBy: 'rssh-host-auth-label',
                      value: form.authType,
                      options: [
                        { value: 'password', label: t('auth.password') },
                        { value: 'privateKey', label: t('auth.privateKey') },
                      ],
                      onChange: (value) => set('authType', value),
                    }),
                  ),
              reuseBastion
                ? h('div', { className: 'rssh-note-box' }, t('form.bastionPresetReuseHint'))
                : form.authType === 'password'
                ? h(
                    'div',
                    { className: 'rssh-field' },
                    h(
                      'label',
                      { className: 'rssh-label', htmlFor: 'rssh-host-password' },
                      h('span', null, t('form.password')),
                      secretHint ? h('span', { className: 'rssh-hint' }, secretHint) : null,
                    ),
                    h(
                      'div',
                      { className: 'rssh-inline' },
                      h('input', {
                        id: 'rssh-host-password',
                        className: 'rssh-input',
                        type: showPassword ? 'text' : 'password',
                        autoComplete: 'new-password',
                        value: form.password,
                        placeholder: isEdit ? t('form.secretKeep') : t('form.passwordPlaceholder'),
                        onChange: (event) => set('password', event.target.value),
                      }),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'rssh-btn',
                          onClick: () => setShowPassword((value) => !value),
                        },
                        showPassword ? t('form.hide') : t('form.show'),
                      ),
                    ),
                  )
                : h(
                    React.Fragment,
                    null,
                    h(
                      'div',
                      { className: 'rssh-field' },
                      h(
                        'label',
                        { className: 'rssh-label', htmlFor: 'rssh-host-key' },
                        h('span', null, t('form.privateKey')),
                        secretHint ? h('span', { className: 'rssh-hint' }, secretHint) : null,
                      ),
                      h('textarea', {
                        id: 'rssh-host-key',
                        className: 'rssh-textarea rssh-textarea-key',
                        value: form.privateKey,
                        placeholder: isEdit ? t('form.secretKeep') : t('form.privateKeyPlaceholder'),
                        spellCheck: false,
                        onChange: (event) => set('privateKey', event.target.value),
                      }),
                      h('input', {
                        ref: keyFileRef,
                        type: 'file',
                        accept: '.pem,.key,.txt,text/plain',
                        style: { display: 'none' },
                        onChange: async (event) => {
                          const file = event.target.files?.[0]
                          event.target.value = ''
                          if (!file) return
                          try {
                            set('privateKey', await file.text())
                          } catch {}
                        },
                      }),
                      h(
                        'div',
                        { style: { marginTop: 7 } },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'rssh-btn',
                            onClick: () => keyFileRef.current?.click(),
                          },
                          t('form.chooseFile'),
                        ),
                      ),
                      h('span', { className: 'rssh-hint', style: { display: 'block', marginTop: 5 } }, t('form.privateKeyHint')),
                    ),
                    h(
                      'label',
                      { className: 'rssh-field', htmlFor: 'rssh-host-passphrase' },
                      h('span', { className: 'rssh-label' }, t('form.passphrase')),
                      h('input', {
                        id: 'rssh-host-passphrase',
                        className: 'rssh-input',
                        type: 'password',
                        autoComplete: 'new-password',
                        value: form.passphrase,
                        placeholder: t('form.passphrasePlaceholder'),
                        onChange: (event) => set('passphrase', event.target.value),
                      }),
                    ),
                  ),
              form.transport === 'sangfor'
                ? h(
                    React.Fragment,
                    null,
                    h(
                      'div',
                      { className: 'rssh-field', style: { position: 'relative' } },
                      h(
                        'label',
                        { className: 'rssh-label', htmlFor: 'rssh-host-asset-ip' },
                        h('span', null, t('form.assetIp')),
                        assetSearchLabel
                          ? h(
                              'span',
                              { className: 'rssh-hint' },
                              t('form.assetSearchUsing').replace('{name}', assetSearchLabel),
                            )
                          : null,
                      ),
                      h('input', {
                        id: 'rssh-host-asset-ip',
                        className: 'rssh-input',
                        value: form.assetIp,
                        placeholder: t('form.assetIpPlaceholder'),
                        maxLength: 128,
                        onChange: (event) => {
                          skipNextAssetSearch.current = false
                          set('assetIp', event.target.value)
                          setAssetOpen(true)
                        },
                        onFocus: () => {
                          if (assetResults.length > 0 || assetError || assetSearched) setAssetOpen(true)
                        },
                        onBlur: () => {
                          setTimeout(() => setAssetOpen(false), 150)
                        },
                      }),
                      assetOpen && (assetSearching || assetError || assetSearched || assetResults.length > 0)
                        ? h(
                            'div',
                            { className: 'rssh-asset-menu', onMouseDown: (event) => event.preventDefault() },
                            assetSearching
                              ? h('div', { className: 'rssh-asset-empty' }, t('form.assetSearching'))
                              : assetError
                                ? h('div', { className: 'rssh-asset-empty rssh-asset-error' }, assetError)
                                : assetResults.length > 0
                                  ? assetResults.map((asset) =>
                                      h(
                                        'button',
                                        {
                                          key: asset.number,
                                          type: 'button',
                                          className: 'rssh-asset-option',
                                          onClick: () => {
                                            skipNextAssetSearch.current = true
                                            set('assetIp', asset.ip)
                                            setAssetOpen(false)
                                            setAssetResults([])
                                            setAssetSearched(false)
                                          },
                                        },
                                        h('span', { className: 'rssh-mono' }, asset.ip),
                                        h('span', { className: 'rssh-asset-name' }, asset.name),
                                        h('span', { className: 'rssh-hint' }, asset.type),
                                      ),
                                    )
                                  : h('div', { className: 'rssh-asset-empty' }, t('form.assetNoResults')),
                          )
                        : null,
                      h(
                        'span',
                        { className: 'rssh-hint', style: { display: 'block', marginTop: 5 } },
                        assetSearchHostId ? t('form.assetSearchHint') : t('form.assetSearchUnavailable'),
                      ),
                    ),
                    h(
                      'div',
                      { className: 'rssh-field' },
                      h('label', { id: 'rssh-host-account-label', className: 'rssh-label', htmlFor: 'rssh-host-account' }, t('form.account')),
                      h(Select, {
                        id: 'rssh-host-account',
                        labelledBy: 'rssh-host-account-label',
                        value: form.account,
                        options: [
                          { value: 'root', label: t('form.accountRoot') },
                          { value: 'user', label: t('form.accountUser') },
                        ],
                        onChange: (value) => set('account', value),
                      }),
                    ),
                    form.account === 'user'
                      ? h(
                          'label',
                          { className: 'rssh-field', htmlFor: 'rssh-host-target-user' },
                          h('span', { className: 'rssh-label' }, t('form.targetUsername')),
                          h('input', {
                            id: 'rssh-host-target-user',
                            className: 'rssh-input',
                            value: form.targetUsername,
                            placeholder: t('form.targetUsernamePlaceholder'),
                            maxLength: 128,
                            onChange: (event) => set('targetUsername', event.target.value),
                          }),
                        )
                      : null,
                    h(
                      'label',
                      { className: 'rssh-field', htmlFor: 'rssh-host-target-password' },
                      h('span', { className: 'rssh-label' }, t('form.targetPassword')),
                      h('input', {
                        id: 'rssh-host-target-password',
                        className: 'rssh-input',
                        type: 'password',
                        autoComplete: 'new-password',
                        value: form.targetPassword,
                        placeholder: t('form.targetPasswordPlaceholder'),
                        onChange: (event) => set('targetPassword', event.target.value),
                      }),
                    ),
                    h('div', { className: 'rssh-note-box' }, t('form.bastionHint')),
                  )
                : null,
              form.transport !== 'sangfor'
                ? h(
                    'div',
                    { className: 'rssh-field' },
                    h(
                      'label',
                      { id: 'rssh-host-elevation-label', className: 'rssh-label', htmlFor: 'rssh-host-elevation' },
                      t('form.elevation'),
                    ),
                    h(Select, {
                      id: 'rssh-host-elevation',
                      labelledBy: 'rssh-host-elevation-label',
                      value: form.elevation,
                      options: [
                        { value: 'none', label: t('form.elevationNone') },
                        { value: 'sudo', label: t('form.elevationSudo') },
                        { value: 'sudo-i', label: t('form.elevationSudoI') },
                      ],
                      onChange: (value) => set('elevation', value),
                    }),
                    h('span', { className: 'rssh-hint', style: { display: 'block', marginTop: 5 } }, t('form.elevationHint')),
                  )
                : null,
              form.transport !== 'sangfor' && form.elevation !== 'none'
                ? h(
                    'label',
                    { className: 'rssh-field', htmlFor: 'rssh-host-elevation-password' },
                    h('span', { className: 'rssh-label' }, t('form.elevationPassword')),
                    h('input', {
                      id: 'rssh-host-elevation-password',
                      className: 'rssh-input',
                      type: 'password',
                      autoComplete: 'new-password',
                      value: form.elevationPassword,
                      placeholder: t('form.elevationPasswordPlaceholder'),
                      onChange: (event) => set('elevationPassword', event.target.value),
                    }),
                  )
                : null,
              isEdit && host.hostKey
                ? h(
                    'div',
                    { className: 'rssh-note-box' },
                    h('div', { className: 'rssh-label' }, t('form.hostKey')),
                    h('div', { className: 'rssh-mono' }, host.hostKey),
                    h('div', { style: { marginTop: 6 } }, t('form.hostKeyHint')),
                    h(
                      'label',
                      { className: 'rssh-check' },
                      h('input', {
                        type: 'checkbox',
                        checked: form.resetHostKey,
                        onChange: (event) => set('resetHostKey', event.target.checked),
                      }),
                      h('span', null, t('form.resetHostKey'), h('span', { className: 'rssh-hint', style: { display: 'block' } }, t('form.resetHostKeyHint'))),
                    ),
                  )
                : h('div', { className: 'rssh-note-box' }, t('form.hostKeyHint')),
              h('div', { className: 'rssh-note-box' }, t('host.form.warningModel')),
            ),
            h(
              'div',
              { className: 'rssh-modal-foot' },
              h('button', { type: 'button', className: 'rssh-btn', onClick: onClose, disabled: saving }, t('form.cancel')),
              h('button', { type: 'submit', className: 'rssh-btn rssh-btn-primary', disabled: saving }, saving ? t('form.saving') : t('form.save')),
            ),
          ),
        ),
      )
    }

    function LegacyPage({ ctx, t }) {
      useLocaleTick(ctx)
      const [profiles, setProfiles] = useState(null)
      const [loading, setLoading] = useState(true)
      const [loadError, setLoadError] = useState('')
      const [editing, setEditing] = useState(null)
      const [toast, setToast] = useState('')
      const [busyId, setBusyId] = useState('')
      const [tests, setTests] = useState({})
      const [confirmId, setConfirmId] = useState('')

      const reload = useCallback(async () => {
        setLoading(true)
        try {
          const data = await api('/profiles')
          setProfiles(data.profiles)
          setLoadError('')
        } catch (error) {
          setLoadError(errorText(error))
        } finally {
          setLoading(false)
        }
      }, [])

      useEffect(() => {
        reload()
      }, [reload])

      useEffect(() => {
        if (!toast) return
        const timer = setTimeout(() => setToast(''), 3200)
        return () => clearTimeout(timer)
      }, [toast])

      useEffect(() => {
        if (!confirmId) return
        const timer = setTimeout(() => setConfirmId(''), 5000)
        return () => clearTimeout(timer)
      }, [confirmId])

      const handleTest = useCallback(
        async (id) => {
          setBusyId(id)
          setTests((current) => ({ ...current, [id]: { phase: 'busy' } }))
          try {
            const data = await api(`/profiles/${encodeURIComponent(id)}/test`, { method: 'POST' })
            const result = data.result
            setTests((current) => ({
              ...current,
              [id]: result.success
                ? { phase: 'ok', latencyMs: result.latencyMs, hostKey: result.hostKey }
                : { phase: 'error', message: result.error?.message || t('test.failure') },
            }))
            if (result.success) await reload()
          } catch (error) {
            setTests((current) => ({ ...current, [id]: { phase: 'error', message: errorText(error) } }))
          } finally {
            setBusyId('')
          }
        },
        [reload, t],
      )

      const handleDelete = useCallback(
        async (id, cancel) => {
          if (cancel) {
            setConfirmId('')
            return
          }
          if (confirmId !== id) {
            setConfirmId(id)
            return
          }
          setBusyId(id)
          try {
            await api(`/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' })
            setConfirmId('')
            setToast(t('toast.deleted'))
            await reload()
          } catch (error) {
            setToast(errorText(error))
          } finally {
            setBusyId('')
          }
        },
        [confirmId, reload, t],
      )

      const handleCopy = useCallback(
        async (id) => {
          try {
            await navigator.clipboard.writeText(id)
            setToast(t('toast.copied'))
          } catch {
            setToast(t('toast.copyFailed'))
          }
        },
        [t],
      )

      const handleSaved = useCallback(async () => {
        setEditing(null)
        setToast(t('toast.saved'))
        await reload()
      }, [reload, t])

      const closeEditor = useCallback(() => setEditing(null), [])

      return h(
        'div',
        { className: 'rssh-page' },
        h(
          'div',
          { className: 'rssh-inner' },
          h(
            'header',
            { className: 'rssh-header' },
            h(
              'div',
              null,
              h('h1', { className: 'rssh-title' }, t('panel.title')),
              h('p', { className: 'rssh-subtitle' }, t('panel.subtitle')),
            ),
            h(
              'div',
              { className: 'rssh-header-actions' },
              h('button', { type: 'button', className: 'rssh-btn', onClick: reload, disabled: loading }, t('page.refresh')),
              h(
                'button',
                { type: 'button', className: 'rssh-btn rssh-btn-primary', onClick: () => setEditing({ mode: 'new' }) },
                `+ ${t('add')}`,
              ),
            ),
          ),
          loadError
            ? h(
                'div',
                { className: 'rssh-banner', role: 'alert' },
                h('div', null, t('page.loadFailed'), ': ', loadError),
                h('button', { type: 'button', className: 'rssh-banner-close', onClick: reload }, t('page.retry')),
              )
            : null,
          loading && profiles === null
            ? h('div', { className: 'rssh-loading' }, '…')
            : profiles && profiles.length === 0
              ? h(
                  'div',
                  { className: 'rssh-empty' },
                  h('h2', { className: 'rssh-empty-title' }, t('empty.title')),
                  h('p', { className: 'rssh-empty-body' }, t('empty.body')),
                  h(
                    'button',
                    { type: 'button', className: 'rssh-btn rssh-btn-primary', onClick: () => setEditing({ mode: 'new' }) },
                    `+ ${t('add')}`,
                  ),
                )
              : (profiles || []).map((profile) =>
                  h(ConnectionCard, {
                    key: profile.id,
                    profile,
                    t,
                    busy: busyId === profile.id,
                    test: tests[profile.id],
                    confirming: confirmId === profile.id,
                    onTest: handleTest,
                    onEdit: (value) => setEditing({ mode: 'edit', profile: value }),
                    onDelete: handleDelete,
                    onCopy: handleCopy,
                  }),
                ),
          h('div', { className: 'rssh-footnote' }, t('page.securityNote')),
          editing
            ? h(ConnectionForm, {
                key: editing.mode === 'new' ? 'new' : editing.profile.id,
                t,
                profile: editing.mode === 'edit' ? editing.profile : null,
                onClose: closeEditor,
                onSaved: handleSaved,
              })
            : null,
          toast ? h('div', { className: 'rssh-toast', role: 'status' }, toast) : null,
        ),
      )
    }

    function Page({ ctx, t }) {
      useLocaleTick(ctx)
      const [groups, setGroups] = useState(null)
      const [loading, setLoading] = useState(true)
      const [loadError, setLoadError] = useState('')
      const [editingGroup, setEditingGroup] = useState(null)
      const [editingHost, setEditingHost] = useState(null)
      const [toast, setToast] = useState('')
      const [busyId, setBusyId] = useState('')
      const [groupTestBusy, setGroupTestBusy] = useState('')
      const [tests, setTests] = useState({})
      const [confirmGroup, setConfirmGroup] = useState('')
      const [confirmHost, setConfirmHost] = useState('')

      const reload = useCallback(async () => {
        setLoading(true)
        try {
          const data = await api('/profiles')
          setGroups(data.profiles)
          setLoadError('')
        } catch (error) {
          setLoadError(errorText(error))
        } finally {
          setLoading(false)
        }
      }, [])

      useEffect(() => {
        reload()
      }, [reload])

      useEffect(() => {
        if (!toast) return
        const timer = setTimeout(() => setToast(''), 3200)
        return () => clearTimeout(timer)
      }, [toast])

      useEffect(() => {
        if (!confirmGroup) return
        const timer = setTimeout(() => setConfirmGroup(''), 5000)
        return () => clearTimeout(timer)
      }, [confirmGroup])

      useEffect(() => {
        if (!confirmHost) return
        const timer = setTimeout(() => setConfirmHost(''), 5000)
        return () => clearTimeout(timer)
      }, [confirmHost])

      const handleTestHost = useCallback(
        async (groupId, hostId) => {
          setBusyId(hostId)
          setTests((current) => ({ ...current, [hostId]: { phase: 'busy' } }))
          try {
            const data = await api(
              `/profiles/${encodeURIComponent(groupId)}/hosts/${encodeURIComponent(hostId)}/test`,
              { method: 'POST' },
            )
            const result = data.result
            setTests((current) => ({
              ...current,
              [hostId]: result.success
                ? { phase: 'ok', latencyMs: result.latencyMs, hostKey: result.hostKey }
                : { phase: 'error', message: result.error?.message || t('test.failure') },
            }))
            if (result.success) await reload()
          } catch (error) {
            setTests((current) => ({ ...current, [hostId]: { phase: 'error', message: errorText(error) } }))
          } finally {
            setBusyId('')
          }
        },
        [reload, t],
      )

      const handleTestGroup = useCallback(
        async (group) => {
          setGroupTestBusy(group.id)
          setTests((current) => {
            const next = { ...current }
            for (const host of group.hosts) next[host.id] = { phase: 'busy' }
            return next
          })
          try {
            const data = await api(`/profiles/${encodeURIComponent(group.id)}/test`, { method: 'POST' })
            const results = Array.isArray(data.results) ? data.results : []
            setTests((current) => {
              const next = { ...current }
              for (const result of results) {
                next[result.id] = result.success
                  ? { phase: 'ok', latencyMs: result.latencyMs, hostKey: result.hostKey }
                  : { phase: 'error', message: result.error || t('test.failure') }
              }
              return next
            })
            if (results.some((result) => result.success)) await reload()
          } catch (error) {
            setTests((current) => {
              const next = { ...current }
              for (const host of group.hosts) next[host.id] = { phase: 'error', message: errorText(error) }
              return next
            })
          } finally {
            setGroupTestBusy('')
          }
        },
        [reload, t],
      )

      const handleDeleteGroup = useCallback(
        async (id) => {
          if (confirmGroup !== id) {
            setConfirmGroup(id)
            return
          }
          setBusyId(id)
          try {
            await api(`/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' })
            setConfirmGroup('')
            setToast(t('toast.groupDeleted'))
            await reload()
          } catch (error) {
            setToast(errorText(error))
          } finally {
            setBusyId('')
          }
        },
        [confirmGroup, reload, t],
      )

      const handleDeleteHost = useCallback(
        async (groupId, hostId) => {
          const key = `${groupId}:${hostId}`
          if (confirmHost !== key) {
            setConfirmHost(key)
            return
          }
          setBusyId(hostId)
          try {
            await api(`/profiles/${encodeURIComponent(groupId)}/hosts/${encodeURIComponent(hostId)}`, {
              method: 'DELETE',
            })
            setConfirmHost('')
            setToast(t('toast.hostDeleted'))
            await reload()
          } catch (error) {
            setToast(errorText(error))
          } finally {
            setBusyId('')
          }
        },
        [confirmHost, reload, t],
      )

      const handleCopy = useCallback(
        async (id) => {
          try {
            await navigator.clipboard.writeText(id)
            setToast(t('toast.copied'))
          } catch {
            setToast(t('toast.copyFailed'))
          }
        },
        [t],
      )

      const handleGroupSaved = useCallback(
        async (profile) => {
          setEditingGroup(null)
          setToast(t('toast.groupSaved'))
          await reload()
          if (profile && Array.isArray(profile.hosts) && profile.hosts.length === 0) {
            setEditingHost({ groupId: profile.id, groupName: profile.name, host: null })
          }
        },
        [reload, t],
      )

      const handleHostSaved = useCallback(async () => {
        setEditingHost(null)
        setToast(t('toast.hostSaved'))
        await reload()
      }, [reload, t])

      const closeGroupEditor = useCallback(() => setEditingGroup(null), [])
      const closeHostEditor = useCallback(() => setEditingHost(null), [])
      const openNewGroup = () => {
        setEditingHost(null)
        setEditingGroup({ mode: 'new' })
      }
      const openEditGroup = (group) => {
        setEditingHost(null)
        setEditingGroup({ mode: 'edit', group })
      }
      const openAddHost = (group) => {
        setEditingGroup(null)
        const searchHost = group.hosts.find((host) => host.transport === 'sangfor')
        setEditingHost({
          groupId: group.id,
          groupName: group.name,
          host: null,
          searchHostId: searchHost?.id,
          searchHostLabel: searchHost?.label,
        })
      }
      const openEditHost = (group, host) => {
        setEditingGroup(null)
        const searchHost = host.transport === 'sangfor' ? host : group.hosts.find((entry) => entry.transport === 'sangfor')
        setEditingHost({
          groupId: group.id,
          groupName: group.name,
          host,
          searchHostId: searchHost?.id,
          searchHostLabel: searchHost?.label,
        })
      }

      const bastionPresets = []
      const seenBastions = new Set()
      for (const group of groups || []) {
        for (const host of group.hosts) {
          if (host.transport !== 'sangfor' || !host.credentialConfigured) continue
          const key = `${host.host}:${host.port}:${host.username}:${host.authType}`
          if (seenBastions.has(key)) continue
          seenBastions.add(key)
          bastionPresets.push({
            id: host.id,
            groupId: group.id,
            host: host.host,
            port: host.port,
            username: host.username,
            authType: host.authType,
            label: `${host.host}:${host.port} · ${host.username}`,
          })
        }
      }

      return h(
        'div',
        { className: 'rssh-page' },
        h(
          'div',
          { className: 'rssh-inner' },
          h(
            'header',
            { className: 'rssh-header' },
            h(
              'div',
              null,
              h('h1', { className: 'rssh-title' }, t('panel.title')),
              h('p', { className: 'rssh-subtitle' }, t('panel.subtitle')),
            ),
            h(
              'div',
              { className: 'rssh-header-actions' },
              h('button', { type: 'button', className: 'rssh-btn', onClick: reload, disabled: loading }, t('page.refresh')),
              h('button', { type: 'button', className: 'rssh-btn rssh-btn-primary', onClick: openNewGroup }, `+ ${t('add')}`),
            ),
          ),
          loadError
            ? h(
                'div',
                { className: 'rssh-banner', role: 'alert' },
                h('div', null, t('page.loadFailed'), ': ', loadError),
                h('button', { type: 'button', className: 'rssh-banner-close', onClick: reload }, t('page.retry')),
              )
            : null,
          loading && groups === null
            ? h('div', { className: 'rssh-loading' }, '…')
            : groups && groups.length === 0
              ? h(
                  'div',
                  { className: 'rssh-empty' },
                  h('h2', { className: 'rssh-empty-title' }, t('empty.title')),
                  h('p', { className: 'rssh-empty-body' }, t('empty.body')),
                  h('button', { type: 'button', className: 'rssh-btn rssh-btn-primary', onClick: openNewGroup }, `+ ${t('add')}`),
                )
              : (groups || []).map((group) =>
                  h(GroupCard, {
                    key: group.id,
                    group,
                    t,
                    busyId,
                    groupTestBusy,
                    tests,
                    confirmingGroup: confirmGroup,
                    confirmingHost: confirmHost,
                    onTestHost: handleTestHost,
                    onEditHost: openEditHost,
                    onDeleteHost: handleDeleteHost,
                    onCancelDeleteHost: () => setConfirmHost(''),
                    onAddHost: () => openAddHost(group),
                    onEditGroup: openEditGroup,
                    onDeleteGroup: handleDeleteGroup,
                    onCancelDeleteGroup: () => setConfirmGroup(''),
                    onCopy: handleCopy,
                    onTestGroup: handleTestGroup,
                  }),
                ),
          h('div', { className: 'rssh-footnote' }, t('page.securityNote')),
          editingGroup
            ? h(GroupForm, {
                key: editingGroup.mode === 'new' ? 'new-group' : editingGroup.group.id,
                t,
                group: editingGroup.mode === 'edit' ? editingGroup.group : null,
                onClose: closeGroupEditor,
                onSaved: handleGroupSaved,
              })
            : null,
          editingHost
            ? h(HostForm, {
                key: editingHost.host ? editingHost.host.id : `new-host-${editingHost.groupId}`,
                t,
                groupId: editingHost.groupId,
                groupName: editingHost.groupName,
                host: editingHost.host,
                searchHostId: editingHost.searchHostId,
                searchHostLabel: editingHost.searchHostLabel,
                bastionPresets,
                onClose: closeHostEditor,
                onSaved: handleHostSaved,
              })
            : null,
          toast ? h('div', { className: 'rssh-toast', role: 'status' }, toast) : null,
        ),
      )
    }

    const inject = ['slots', 'locale']

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'remote-ssh: locale')
      const t = ctx.locale.bind(NS)

      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = '@local/dsh-remote-ssh'
        style.dataset.pluginCss = 'remote-ssh/page.css'
        style.textContent = CSS
        document.head.appendChild(style)
        return () => style.remove()
      }, 'remote-ssh: styles')

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: 'remote-ssh',
            order: 20,
            label: () => t('panel.title'),
          },
          SidebarIcon,
        ),
      )

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: 'remote-ssh',
          },
          () => h(Page, { ctx, t }),
        ),
      )
    }

    return { inject, apply }
  },
})
