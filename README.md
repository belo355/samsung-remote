# Controle universal · Samsung Smart TV (Angular, sem backend)

Controle remoto web para TVs Samsung Tizen (2016+). O navegador abre um **WebSocket direto na TV**
(`/api/v2/channels/samsung.remote.api.v2`), então não existe servidor intermediário.

## Rodar

```bash
npm install
npm start            # = ng serve --host 0.0.0.0 --port 4200
```

Abra `http://<IP-do-seu-computador>:4200` no celular (mesma rede Wi-Fi da TV).

Para servir de forma estática (qualquer servidor HTTP da sua rede):

```bash
npm run build        # saída em dist/samsung-remote/browser
```

## Conectar

1. Na TV: Configurações › Geral › Rede › Status da rede › Configurações de IP — anote o IP.
2. No app, informe o IP e escolha o modo:
   - **Seguro (wss :8002)** — TVs 2018+. Na primeira vez abra `https://<IP-da-TV>:8002/` em uma aba, aceite o
     aviso de certificado e volte; a TV mostra “Permitir” e devolve um token, salvo no `localStorage`.
   - **Padrão (ws :8001)** — TVs mais antigas.
3. Se a TV negar: Configurações › Geral › Gerenciador de dispositivos externos › Gerenciador de dispositivos de
   conexão › Notificação de acesso.

## Limitações do navegador

- Servir o app em **HTTPS** bloqueia `ws://` (mixed content): use o modo seguro ou HTTP na rede local.
- Não há Wake-on-LAN em navegadores: para **ligar** uma TV totalmente desligada use o controle físico/SmartThings.
  `KEY_POWER` desliga e, em muitas TVs, também liga a partir do standby de rede.
- Descoberta automática (SSDP/mDNS) não é possível: o IP é digitado.
- IDs de apps (Netflix, YouTube…) variam por modelo/região; há um campo para abrir qualquer app por ID.

## Estrutura

```
src/app/
  models/tv.models.ts            perfis, teclas (K) e apps
  services/samsung-tv.service.ts WebSocket, token, comandos, log, persistência (signals)
  components/rc-key.ts           botão com repetição ao segurar (volume/canal/setas)
  components/remote-control.*    abas: Controle · Números · Mídia & apps · Texto + atalhos de teclado
  components/connection-panel.*  TVs salvas, IP, modo, estados e dicas
  components/command-log.ts      registro dos comandos enviados
```

Há um **modo demonstração** (não abre socket) para testar a interface sem TV.
