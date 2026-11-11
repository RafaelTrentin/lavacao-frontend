# Ciclo de vida Web Push

## Constatações

O logout chamava somente a revogação nativa. A inscrição Web continuava associada ao usuário/empresa no servidor e no navegador. `enablePushNotifications` reaproveitava a inscrição sem fixar o JWT nem coordenar troca de sessão entre abas. O status local apenas constatava a existência de uma inscrição.

O backend recebia `/notifications` dos fluxos de atendimento e usava essa mesma URL para Web Push e FCM. A aplicação Web possui `/admin/notifications` e `/empresa/:slug/notifications`; o caminho genérico não abre a tela correta. O service worker antigo também navegava diretamente para a URL do payload, sem validar origem ou rota.

## Correção

- `web-push-session.ts` concentra exclusivamente o ciclo Web. `push.ts` mantém os exports usados pelas telas e todo o código de registro/revogação FCM anterior.
- O registro captura o JWT e uma geração compartilhada em localStorage, verifica ambos durante as etapas assíncronas e usa Web Locks para serializar operações entre abas. Navegadores sem Web Locks não habilitam novos registros Web Push; autenticação e FCM continuam disponíveis.
- O vínculo local é salvo antes do POST, permitindo revogar também uma resposta incerta. Renovação com outro endpoint remove o vínculo anterior. Inscrições existentes com permissão concedida são sincronizadas ao abrir a aplicação, recuperar a rede ou atualizar o worker. Não é criada automaticamente uma inscrição após logout; a nova conta pode ativá-la pela interface existente.
- Logout invalida registros em andamento, persiste a pendência, desabilita a exibição no worker, fecha notificações visíveis e cancela a inscrição no navegador. A remoção no backend é tentada com timeout. Falha de rede conserva a prova para nova tentativa ao abrir a aplicação ou recuperar a conexão. O login pode prosseguir quando a limpeza local foi concluída; nova ativação Web Push aguarda a confirmação das pendências.
- O novo `POST /push-notifications/web/revoke` não exige JWT antigo: exige endpoint, ambas as chaves da inscrição e o usuário/empresa original. Só permite excluir o vínculo correspondente, retorna resposta uniforme e possui ThrottlerGuard. DTO e whitelist rejeitam campos inesperados. Nenhum JWT antigo é persistido para cleanup. A prova é sensível: não é registrada em logs e só é descartada após confirmação. Não houve alteração de schema.
- Registro e consulta de chave durante o bloqueio usam transporte HTTP separado. Um 401 não invoca recursivamente o logout que precisaria do mesmo bloqueio. Nos demais 401, a limpeza Web precede a navegação; a checagem de token impede encerrar sessão nova.
- Eventos `storage` atualizam identidade React e descartam cache privado das outras abas. O navegador compartilha uma sessão por origem; logout em uma aba encerra a sessão compartilhada.
- O backend deriva a URL **Web** do papel/slug consultados no banco e inclui `userId`/`businessId` no payload. A URL **FCM** continua com o contrato anterior, incluindo `/notifications`, reconhecido pelo Android distribuído. Fluxos nativos e suas credenciais de revogação não foram alterados.
- O worker persiste somente IDs do destinatário, descarta mensagens de outra conta/empresa, payloads antigos sem escopo e URLs fora da lista permitida. O clique revalida o destinatário e só abre rotas de notificações na mesma origem, sem query string, fragmento ou URL externa. As operações do worker são serializadas.

## Limites e publicação futura

Não foi realizado envio real a navegadores/FCM nem alteração em produção. Os testes automatizados usam HTTP local, persistência isolada e simuladores de browser/worker/transportes; não substituem homologação real em navegadores suportados.

Quando houver autorização para publicar: backend primeiro (endpoint de revogação e payload contextual), depois frontend e novo service worker. Recarregar abas antigas é necessário para que executem o novo ciclo de logout; o worker novo ativa imediatamente e rejeita payloads sem escopo. Confirmar ativação/renovação, logout offline e clique em navegador real após a atualização. Uma inscrição renovada pelo navegador com a aplicação fechada será reconciliada quando a aplicação voltar a abrir.

Se o navegador for fechado durante uma chamada de registro, o endpoint antigo pode permanecer no banco até a limpeza seguinte ou erro 410. A nova implementação suprime mensagens de destinatário diferente no worker e cancela a inscrição ao sair; não promete desfazer mensagens já vistas antes do logout. Falhas locais de armazenamento/worker são erros de sincronização e podem exigir recarregar a página.

Sem alteração de VAPID/Firebase, migração, commit, publicação ou geração de AAB. Esta correção Web não exige atualizar o Android distribuído.

## Validação local

- Frontend: 46 testes aprovados, incluindo os 8 testes existentes de logout nativo; TypeScript e build Web aprovados. O build mantém avisos sobre tamanho do bundle e base Browserslist desatualizada.
- Backend: 238 testes aprovados e build aprovado. Os 28 testes PostgreSQL de concorrência da etapa anterior ficam ignorados nesta execução normal; esta etapa não alterou transações de agendamentos.
- Casos novos: A → push → logout → B, offline/retomada, registro atrasado versus logout de outra aba, cliques simultâneos, renovação, sessão alterada durante permissão, cache/React entre abas, 401 antigo, URLs/contexto de clique, prova de revogação, erro 410 e compatibilidade da URL FCM.
