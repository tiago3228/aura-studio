# Clientes mais rápidos e evolução com fotos

## Objetivo
- Reduzir a espera ao abrir a lista de clientes.
- Facilitar o registro de fotos de evolução em cada sessão do prontuário.

## Implementação
1. Otimizar a consulta da lista para buscar apenas os dados exibidos, usar o identificador da clínica explicitamente e manter os resultados recentes em cache durante a navegação.
2. Melhorar o carregamento visual da lista para que a tela apareça imediatamente enquanto os dados são atualizados.
3. No prontuário do cliente, permitir classificar cada foto como “Antes”, “Depois” ou “Evolução”, exibir prévias antes de salvar e comprimir imagens para uploads mais rápidos.
4. Exibir as fotos salvas por sessão com sua classificação e acesso à imagem ampliada.
5. Validar a lista de clientes e o fluxo de criação de um registro com fotos em telas desktop e celular.

## Observação
A estrutura de prontuário e armazenamento privado de fotos já existe; a melhoria aproveitará esse fluxo sem remover funcionalidades nem expor imagens publicamente.
