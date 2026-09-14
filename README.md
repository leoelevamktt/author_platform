# Author Platform

Plataforma autoral estática e responsiva para divulgação e venda de livros, histórias e composições musicais.

## O que já funciona

- Página de apresentação do autor.
- Livro em destaque e catálogo com filtros.
- Área musical com previews sintetizados pelo navegador.
- Carrinho de compras.
- Checkout demonstrativo local.
- Liberação automática de downloads demonstrativos após aprovação local do pedido.
- Formulário de contato salvo no navegador.
- Painel administrativo local para produtos, perfil, pedidos e mensagens.
- Exportação/importação de backup em JSON.
- Persistência via `localStorage`.
- Layout responsivo, sem bibliotecas, frameworks, CDNs ou APIs externas.

## Rodar localmente

Pode abrir `index.html` diretamente no navegador. Para uma experiência mais próxima de produção:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Painel administrativo

Clique em **Admin** no menu ou em **Administrar conteúdo** no rodapé.

Senha de demonstração: `2026`

> Importante: como o projeto foi solicitado com dados totalmente locais, o painel usa uma senha apenas demonstrativa. Não há autenticação segura no servidor.

## Pagamentos

O checkout atual simula uma aprovação e salva o pedido em `localStorage`. Nenhuma cobrança real acontece.

Para produção, o próximo passo recomendado é integrar um backend/serverless seguro com um provedor como Mercado Pago ou Stripe. A confirmação deve ocorrer por webhook do provedor antes de liberar o arquivo real.

## Publicação

O projeto é compatível com hospedagem estática, incluindo GitHub Pages.
