# 📡 Especificação de Contratos de API REST (Agrupada por Páginas / Telas)

Este documento apresenta a especificação técnica formal e contratos de **API RESTful (JSON)** para todo o ecossistema da **Escala Virtual (Capela Divino Espírito Santo)**, organizado e agrupado por **páginas/telas da aplicação** e 100% alinhado ao modelo de dados do **DER** ([`docs/DER_RECOMENDADO.md`](file:///home/henrique/git/virtual_scale/docs/DER_RECOMENDADO.md)).

> [!IMPORTANT]
> **Identificadores Numéricos**: Todos os identificadores únicos (`id`) e chaves estrangeiras (`*_id`, `minister_ids`) são do tipo **numérico inteiro** (`number` em JSON/TypeScript e `BIGINT` / `INTEGER` no banco de dados).

---

## 📑 Sumário de Navegação Rápida

- [🏛️ 1. Padrões e Convenções Globais da API](#️-1-padrões-e-convenções-globais-da-api)
- [🔐 2. Página: Login & Autenticação (`LoginView`)](#-2-página-login--autenticação-loginview)
- [✍️ 3. Página: Montar Escala (`RosterView`)](#️-3-página-montar-escala-rosterview)
- [📅 4. Página: Calendário de Missas & Escalas (`CalendarView`)](#-4-página-calendário-de-missas--escalas-calendarview)
- [👥 5. Página: Gestão de Membros & Ministros (`MembersView`)](#-5-página-gestão-de-membros--ministros-membersview)
- [📖 6. Página: Catálogo de Celebrações & Categorias (`CelebrationsView`)](#-6-página-catálogo-de-celebrações--categorias-celebrationsview)
- [💻 7. Interfaces e Tipos TypeScript Consolidados](#-7-interfaces-e-tipos-typescript-consolidados)

---

## 🏛️ 1. Padrões e Convenções Globais da API

1. **Protocolo e Formato**: REST sobre HTTPS com payloads em `application/json; charset=utf-8`.
2. **Nomenclatura de Chaves e Parâmetros**:
   - Chaves de objetos JSON, tabelas e colunas em **inglês** (`snake_case` nos payloads e bancos).
   - Descrições, mensagens de erro e documentação técnica em **português**.
3. **Tipagem de Identificadores**:
   - Chaves primárias (`id`) e chaves estrangeiras (`category_id`, `celebration_id`, `celebrant_id`, `user_id`, `member_id`, `event_id`, `minister_ids`) são do tipo **numérico** (`number` / `integer`).
4. **Formato de Datas e Timestamps**:
   - Datas: `YYYY-MM-DD` (ISO 8601, ex: `"2025-10-19"`).
   - Horários: `HH:mm` (24 horas, ex: `"10:00"`, `"19:30"`).
   - Timestamps: `YYYY-MM-DDTHH:mm:ssZ` (UTC ISO 8601).
5. **Autenticação e Autorização**:
   - Header obrigatório: `Authorization: Bearer <jwt_token>`
   - O payload do JWT identifica o `user_id` numérico e seu papel (`role`: `'admin'` ou `'coordinator'`).
6. **Padrão de Erro (RFC 7807 - Problem Details)**:
   ```json
   {
     "type": "https://api.escalas.paroquia.org/errors/validation",
     "title": "Erro de Validação de Dados",
     "status": 422,
     "code": "VALIDATION_FAILED",
     "detail": "O campo 'name' é obrigatório e deve ter no mínimo 3 caracteres.",
     "instance": "/api/v1/members",
     "timestamp": "2025-10-10T14:30:00Z"
   }
   ```

---

## 🔐 2. Página: Login & Autenticação (`LoginView`)

Responsável pelo controle de acesso, autenticação de coordenadores/administradores e recuperação de credenciais.

```mermaid
flowchart LR
    User["Usuário"] --> Form["Formulário de Login"]
    Form --> API["POST /api/v1/auth/login"]
    API --> JWT["JWT Token + Perfil do Usuário"]
    Form -.-> Forgot["POST /api/v1/auth/forgot-password"]
```

### 2.1. `POST /api/v1/auth/login` — Autenticação de Usuário
Autentica o usuário por e-mail e senha, gerando o token de sessão JWT.

- **Método**: `POST`
- **Autenticação**: Pública
- **Request Body**:
  ```json
  {
    "email": "coordenacao@paroquia.org",
    "password": "SenhaSegura123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "user": {
      "id": 1,
      "name": "Coordenador(a) Geral",
      "email": "coordenacao@paroquia.org",
      "role": "admin",
      "last_login_at": "2025-09-10T22:00:00Z"
    }
  }
  ```
- **Response `401 Unauthorized`**:
  ```json
  {
    "type": "https://api.escalas.paroquia.org/errors/unauthorized",
    "title": "Credenciais Inválidas",
    "status": 401,
    "code": "INVALID_CREDENTIALS",
    "detail": "E-mail ou senha incorretos."
  }
  ```

### 2.2. `GET /api/v1/auth/me` — Obter Dados do Usuário Logado
Verifica se a sessão continua ativa e retorna os dados do usuário atual.

- **Método**: `GET`
- **Autenticação**: Bearer Token
- **Response `200 OK`**:
  ```json
  {
    "id": 1,
    "name": "Coordenador(a) Geral",
    "email": "coordenacao@paroquia.org",
    "role": "admin",
    "last_login_at": "2025-09-10T22:00:00Z"
  }
  ```

### 2.3. `POST /api/v1/auth/forgot-password` — Solicitação de Recuperação de Senha
Envia um e-mail com instruções para redefinição de senha.

- **Método**: `POST`
- **Request Body**:
  ```json
  {
    "email": "coordenacao@paroquia.org"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "message": "Se o e-mail estiver cadastrado, as instruções de recuperação serão enviadas em instantes."
  }
  ```

---

## ✍️ 3. Página: Montar Escala (`RosterView`)

Assistente em 4 passos para seleção do rito, data/hora, celebrante, subtítulo e convocação dos ministros da equipe.

```mermaid
flowchart TD
    Step1["1. Selecionar Data e Celebração"] --> Step2["2. Definir Horário, Celebrante e Subtítulo"]
    Step2 --> Step3["3. Convocar Ministros MESC"]
    Step3 --> Step4["4. Publicar Escala"]

    Step1 -.-> E1["GET /api/v1/celebrations<br/>GET /api/v1/categories"]
    Step2 -.-> E2["GET /api/v1/members/celebrants<br/>GET /api/v1/events/check-availability"]
    Step3 -.-> E3["GET /api/v1/members/candidates?date=...&time=..."]
    Step4 -.-> E4["POST /api/v1/events"]
```

### 3.1. `GET /api/v1/celebrations` — Catálogo de Celebrações
Alimenta o seletor do rito litúrgico no **Passo 1**.

- **Método**: `GET`
- **Query Params**:
  - `category_id` *(opcional, inteiro)*: Filtrar por ID numérico da categoria (ex: `1`).
  - `search` *(opcional, string)*: Busca textual no nome da celebração.
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "Santa Missa Dominical",
        "category_id": 1,
        "category": {
          "id": 1,
          "name": "Dominical"
        },
        "created_at": "2025-01-01T00:00:00Z"
      },
      {
        "id": 5,
        "name": "Solenidade de Nossa Senhora Aparecida",
        "category_id": 3,
        "category": {
          "id": 3,
          "name": "Solenidade"
        },
        "created_at": "2025-01-01T00:00:00Z"
      }
    ]
  }
  ```

### 3.2. `GET /api/v1/members/celebrants` — Lista de Celebrantes
Alimenta o dropdown de presidente da celebração no **Passo 2**.

- **Método**: `GET`
- **Query Params**: `status=ativo` (padrão).
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": 10,
        "name": "Pe. Marcelo Rossi",
        "profile": "celebrant",
        "phone": "(11) 99999-0000",
        "avatar_url": "https://lh3.googleusercontent.com/avatar-pe-marcelo.jpg"
      },
      {
        "id": 12,
        "name": "Diác. Francisco Souza",
        "profile": "deacon",
        "phone": "(11) 97777-2222",
        "avatar_url": null
      }
    ]
  }
  ```

### 3.3. `GET /api/v1/events/check-availability` — Validação de Conflito de Horário
Verifica no **Passo 2** se o horário na data já está ocupado (`date + time`).

- **Método**: `GET`
- **Query Params**:
  - `date` *(obrigatório, string)*: `2025-10-19`
  - `time` *(obrigatório, string)*: `10:00`
  - `exclude_event_id` *(opcional, inteiro)*: ID numérico do evento a ignorar em caso de edição (ex: `501`).
- **Response `200 OK` (Disponível)**:
  ```json
  {
    "available": true,
    "date": "2025-10-19",
    "time": "10:00",
    "message": "Horário disponível."
  }
  ```
- **Response `200 OK` (Ocupado)**:
  ```json
  {
    "available": false,
    "date": "2025-10-19",
    "time": "10:00",
    "conflict_event": {
      "id": 501,
      "celebration_name": "Santa Missa Dominical",
      "celebrant_name": "Pe. Marcelo Rossi"
    },
    "message": "Já existe uma celebração cadastrada para esta data e horário."
  }
  ```

### 3.4. `GET /api/v1/members/candidates` — Candidatos a Ministros
Alimenta a lista lateral de ministros aptos para escalação no **Passo 3**.

- **Método**: `GET`
- **Query Params**:
  - `date` *(obrigatório, string)*: `2025-10-19`
  - `time` *(opcional, string)*: `10:00`
  - `search` *(opcional, string)*: Busca textual por nome/telefone.
  - `status` *(opcional, padrão: `ativo`)*: `ativo`.
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "Antônio Carlos Silveira",
        "phone": "(11) 99999-0001",
        "profile": "coordinator",
        "status": "ativo",
        "avatar_url": "https://lh3.googleusercontent.com/avatar-m1.jpg",
        "start_date": "2010-02-15",
        "scales_count_month": 2,
        "is_scheduled_same_day": false
      },
      {
        "id": 2,
        "name": "Maria Aparecida Santos",
        "phone": "(11) 98214-5501",
        "profile": "minister",
        "status": "ativo",
        "avatar_url": null,
        "start_date": "2013-05-20",
        "scales_count_month": 1,
        "is_scheduled_same_day": true
      }
    ]
  }
  ```

### 3.5. `POST /api/v1/events` — Criação Atômica da Escala
Persiste o evento (`EVENT`) e todos os ministros vinculados (`EVENT_MEMBER`) em uma única transação atômica.

- **Método**: `POST`
- **Autenticação**: Bearer Token
- **Request Body**:
  ```json
  {
    "date": "2025-10-19",
    "time": "10:00",
    "celebration_id": 1,
    "celebrant_id": 10,
    "subtitle": "29º Domingo do Tempo Comum",
    "minister_ids": [1, 2, 5, 6]
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": 501,
    "date": "2025-10-19",
    "time": "10:00",
    "subtitle": "29º Domingo do Tempo Comum",
    "celebration": {
      "id": 1,
      "name": "Santa Missa Dominical",
      "category_id": 1
    },
    "celebrant": {
      "id": 10,
      "name": "Pe. Marcelo Rossi",
      "profile": "celebrant"
    },
    "user_id": 1,
    "ministers": [
      {
        "id": 1,
        "name": "Antônio Carlos Silveira",
        "phone": "(11) 99999-0001",
        "avatar_url": "https://lh3.googleusercontent.com/avatar-m1.jpg"
      },
      {
        "id": 2,
        "name": "Maria Aparecida Santos",
        "phone": "(11) 98214-5501",
        "avatar_url": null
      }
    ],
    "created_at": "2025-09-10T22:00:00Z"
  }
  ```

---

## 📅 4. Página: Calendário de Missas & Escalas (`CalendarView`)

Permite visualizar as celebrações do mês no grid, inspecionar a escala completa de um dia selecionado e exportar/compartilhar.

```mermaid
flowchart LR
    Grid["Grid do Calendário Mensal"] --> EMonth["GET /api/v1/events/calendar-summary?year=2025&month=10"]
    ClickDay["Clique em um Dia"] --> EDay["GET /api/v1/events?date=2025-10-19"]
    ActionExport["Exportar / Compartilhar"] --> EExport["GET /api/v1/events/export?year=2025&month=10"]
```

### 4.1. `GET /api/v1/events/calendar-summary` — Resumo Mensal para o Grid
Retorna a lista de dias do mês que possuem celebrações agendadas para renderizar os marcadores visuais no calendário.

- **Método**: `GET`
- **Query Params**:
  - `year` *(obrigatório, inteiro)*: `2025`
  - `month` *(obrigatório, inteiro)*: `10`
- **Response `200 OK`**:
  ```json
  {
    "year": 2025,
    "month": 10,
    "scheduled_days": [
      {
        "date": "2025-10-05",
        "events_count": 2,
        "celebration_names": ["Santa Missa Dominical", "Santa Missa Dominical"]
      },
      {
        "date": "2025-10-12",
        "events_count": 1,
        "celebration_names": ["Solenidade de Nossa Senhora Aparecida"]
      },
      {
        "date": "2025-10-19",
        "events_count": 1,
        "celebration_names": ["Santa Missa Dominical"]
      }
    ]
  }
  ```

### 4.2. `GET /api/v1/events` (com filtro por Data) — Detalhes das Missas do Dia
Alimenta o card lateral com a celebração, celebrante, subtítulo e ministros escalados no dia clicado.

- **Método**: `GET`
- **Query Params**: `date=YYYY-MM-DD` (ex: `2025-10-19`).
- **Response `200 OK`**:
  ```json
  {
    "date": "2025-10-19",
    "events": [
      {
        "id": 501,
        "time": "10:00",
        "subtitle": "29º Domingo do Tempo Comum",
        "celebration": {
          "id": 1,
          "name": "Santa Missa Dominical",
          "category_name": "Dominical"
        },
        "celebrant": {
          "id": 10,
          "name": "Pe. Marcelo Rossi",
          "profile": "celebrant",
          "phone": "(11) 99999-0000"
        },
        "ministers_count": 4,
        "ministers": [
          {
            "id": 1,
            "name": "Antônio Carlos Silveira",
            "phone": "(11) 99999-0001",
            "profile": "coordinator",
            "avatar_url": "https://lh3.googleusercontent.com/avatar-m1.jpg"
          },
          {
            "id": 2,
            "name": "Maria Aparecida Santos",
            "phone": "(11) 98214-5501",
            "profile": "minister",
            "avatar_url": null
          }
        ]
      }
    ]
  }
  ```

### 4.3. `GET /api/v1/events/export` — Exportação da Escala Mensal
Gera o relatório da escala do mês completo para impressão ou PDF.

- **Método**: `GET`
- **Query Params**: `year=2025`, `month=10`, `format=pdf` | `json`.
- **Response `200 OK` (JSON)**:
  ```json
  {
    "parish": "Capela Divino Espírito Santo",
    "period": "Outubro / 2025",
    "total_events": 8,
    "total_ministers_engaged": 16,
    "events": [...]
  }
  ```

---

## 👥 5. Página: Gestão de Membros & Ministros (`MembersView`)

Gerenciamento cadastral dos membros, ministros MESC, diáconos e celebrantes com filtros de situação e perfil.

```mermaid
flowchart LR
    Stats["Estatísticas"] --> EStats["GET /api/v1/members/stats"]
    List["Lista & Filtros"] --> EList["GET /api/v1/members?profile=...&status=..."]
    Modal["Criar / Editar"] --> EForm["POST /api/v1/members<br/>PUT /api/v1/members/{id}"]
    Delete["Excluir"] --> EDel["DELETE /api/v1/members/{id}"]
```

### 5.1. `GET /api/v1/members/stats` — Indicadores do Cabeçalho
Alimenta os cartões de contagem no topo do quadro.

- **Método**: `GET`
- **Response `200 OK`**:
  ```json
  {
    "total": 18,
    "active": 16,
    "on_leave": 2,
    "by_profile": {
      "minister": 14,
      "celebrant": 2,
      "deacon": 1,
      "coordinator": 1
    }
  }
  ```

### 5.2. `GET /api/v1/members` — Listagem Paginada de Membros
- **Método**: `GET`
- **Query Params**:
  - `status` *(opcional)*: `'ativo'` | `'licenca'`.
  - `profile` *(opcional)*: `'minister'` | `'celebrant'` | `'coordinator'` | `'deacon'`.
  - `search` *(opcional)*: Busca textual por nome ou telefone.
  - `page` *(padrão: `1`)*, `per_page` *(padrão: `20`)*.
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "Antônio Carlos Silveira",
        "phone": "(11) 99999-0001",
        "profile": "coordinator",
        "status": "ativo",
        "start_date": "2010-02-15",
        "avatar_url": "https://lh3.googleusercontent.com/avatar-m1.jpg",
        "created_at": "2025-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "name": "Maria Aparecida Santos",
        "phone": "(11) 98214-5501",
        "profile": "minister",
        "status": "ativo",
        "start_date": "2013-05-20",
        "avatar_url": null,
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "per_page": 20,
      "total": 18,
      "total_pages": 1
    }
  }
  ```

### 5.3. `GET /api/v1/members/{id}` — Detalhes do Membro
- **Método**: `GET`
- **Path Param**: `id` *(inteiro)*: Identificador numérico do membro (ex: `/api/v1/members/1`).
- **Response `200 OK`**:
  ```json
  {
    "id": 1,
    "name": "Antônio Carlos Silveira",
    "phone": "(11) 99999-0001",
    "profile": "coordinator",
    "status": "ativo",
    "start_date": "2010-02-15",
    "avatar_url": "https://lh3.googleusercontent.com/avatar-m1.jpg",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-09-10T18:30:00Z"
  }
  ```

### 5.4. `POST /api/v1/members` — Cadastro de Novo Membro
- **Método**: `POST`
- **Request Body**:
  ```json
  {
    "name": "Carlos Eduardo Lima",
    "phone": "(11) 98765-4321",
    "profile": "minister",
    "status": "ativo",
    "start_date": "2025-02-01",
    "avatar_url": null
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": 19,
    "name": "Carlos Eduardo Lima",
    "phone": "(11) 98765-4321",
    "profile": "minister",
    "status": "ativo",
    "start_date": "2025-02-01",
    "avatar_url": null,
    "created_at": "2025-09-10T22:00:00Z",
    "updated_at": null
  }
  ```

### 5.5. `PUT /api/v1/members/{id}` — Atualização Integral de Membro
- **Método**: `PUT`
- **Path Param**: `id` *(inteiro)*.
- **Request Body**: Dados atualizados do membro.
- **Response `200 OK`**: Membro atualizado.

### 5.6. `PATCH /api/v1/members/{id}/status` — Alternância de Situação (Ativo / Licença)
- **Método**: `PATCH`
- **Path Param**: `id` *(inteiro)*.
- **Request Body**:
  ```json
  {
    "status": "licenca"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "id": 19,
    "status": "licenca",
    "updated_at": "2025-09-10T22:06:00Z"
  }
  ```

### 5.7. `DELETE /api/v1/members/{id}` — Exclusão de Membro
- **Método**: `DELETE`
- **Path Param**: `id` *(inteiro)*.
- **Response `204 No Content`**: Removido com sucesso.
- **Response `409 Conflict`**: Caso possua escalas futuras vinculadas em `EVENT_MEMBER`.

### 5.8. `GET /api/v1/members/{id}/scales-history` — Histórico Individual de Escalas
- **Método**: `GET`
- **Path Param**: `id` *(inteiro)*.
- **Response `200 OK`**:
  ```json
  {
    "member_id": 2,
    "member_name": "Maria Aparecida Santos",
    "summary": {
      "total_scales_all_time": 42,
      "total_scales_current_year": 18,
      "total_scales_current_month": 2
    },
    "scales": [
      {
        "event_id": 501,
        "date": "2025-10-19",
        "time": "10:00",
        "celebration_name": "Santa Missa Dominical",
        "subtitle": "29º Domingo do Tempo Comum",
        "celebrant_name": "Pe. Marcelo Rossi",
        "participated_as": "minister"
      }
    ]
  }
  ```

---

## 📖 6. Página: Catálogo de Celebrações & Categorias (`CelebrationsView`)

Manutenção do catálogo litúrgico de celebrações, ritos e categorias estruturantes da paróquia.

```mermaid
flowchart TD
    Categories["Categorias Litúrgicas"] --> ECat["GET / POST / PUT / DELETE /api/v1/categories"]
    Celebrations["Ritos & Celebrações"] --> ECel["GET / POST / PUT / DELETE /api/v1/celebrations"]
```

### 6.1. `GET /api/v1/categories` — Listagem de Categorias
- **Método**: `GET`
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "Dominical",
        "description": "Celebrações principais dos preceitos dominicais.",
        "created_at": "2025-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "name": "Semanal",
        "description": "Celebrações de terça a sexta-feira.",
        "created_at": "2025-01-01T00:00:00Z"
      },
      {
        "id": 3,
        "name": "Solenidade",
        "description": "Grandes festas do calendário litúrgico.",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ]
  }
  ```

### 6.2. `POST /api/v1/categories` — Criação de Categoria Litúrgica
- **Método**: `POST`
- **Request Body**:
  ```json
  {
    "name": "Votiva",
    "description": "Missas em sufrágio das almas e intenções particulares."
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": 6,
    "name": "Votiva",
    "description": "Missas em sufrágio das almas e intenções particulares.",
    "created_at": "2025-09-10T22:00:00Z"
  }
  ```

### 6.3. `GET /api/v1/celebrations/stats` — Estatísticas de Celebrações
- **Método**: `GET`
- **Response `200 OK`**:
  ```json
  {
    "total_celebrations": 11,
    "by_category": {
      "1": 4,
      "2": 3,
      "3": 2,
      "4": 1,
      "5": 1
    }
  }
  ```

### 6.4. `POST /api/v1/celebrations` — Criação de Celebração
- **Método**: `POST`
- **Request Body**:
  ```json
  {
    "name": "Missa da Esperança (Exéquias)",
    "category_id": 5
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": 12,
    "name": "Missa da Esperança (Exéquias)",
    "category_id": 5,
    "created_at": "2025-09-10T22:00:00Z"
  }
  ```

### 6.5. `PUT /api/v1/celebrations/{id}` — Edição de Celebração
- **Método**: `PUT`
- **Path Param**: `id` *(inteiro)*.
- **Request Body**:
  ```json
  {
    "name": "Missa da Esperança e Exéquias",
    "category_id": 5
  }
  ```
- **Response `200 OK`**: Celebração atualizada.

### 6.6. `DELETE /api/v1/celebrations/{id}` — Exclusão de Celebração
- **Método**: `DELETE`
- **Path Param**: `id` *(inteiro)*.
- **Response `204 No Content`**: Excluída com sucesso.
- **Response `409 Conflict`**: Caso a celebração já tenha eventos cadastrados em `EVENT`.

---

## 💻 7. Interfaces e Tipos TypeScript Consolidados

Definições de tipos compartilhadas para consumo padronizado pelo front-end da aplicação:

```typescript
// ==========================================
// 1. DOMÍNIOS BÁSICOS
// ==========================================
export type MemberProfile = 'minister' | 'celebrant' | 'coordinator' | 'deacon';
export type MemberStatus = 'ativo' | 'licenca';
export type UserRole = 'admin' | 'coordinator';

// ==========================================
// 2. RESPOSTAS PADRÃO DA API
// ==========================================
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  instance?: string;
  timestamp: string;
}

// ==========================================
// 3. TELA: LOGIN & AUTENTICAÇÃO
// ==========================================
export interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  last_login_at: string | null;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  expires_in: number;
  user: UserDTO;
}

// ==========================================
// 4. TELA: GESTÃO DE MEMBROS
// ==========================================
export interface MemberDTO {
  id: number;
  name: string;
  phone: string | null;
  profile: MemberProfile;
  status: MemberStatus;
  start_date: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface MemberStatsDTO {
  total: number;
  active: number;
  on_leave: number;
  by_profile: Record<MemberProfile, number>;
}

export interface CreateMemberRequest {
  name: string;
  phone?: string | null;
  profile: MemberProfile;
  status?: MemberStatus;
  start_date?: string | null;
  avatar_url?: string | null;
}

export interface UpdateMemberRequest {
  name: string;
  phone?: string | null;
  profile: MemberProfile;
  status: MemberStatus;
  start_date?: string | null;
  avatar_url?: string | null;
}

export interface PatchMemberStatusRequest {
  status: MemberStatus;
}

export interface MemberScaleHistoryItemDTO {
  event_id: number;
  date: string;
  time: string;
  celebration_name: string;
  subtitle: string | null;
  celebrant_name: string;
  participated_as: 'celebrant' | 'minister';
}

export interface MemberScalesHistoryDTO {
  member_id: number;
  member_name: string;
  summary: {
    total_scales_all_time: number;
    total_scales_current_year: number;
    total_scales_current_month: number;
  };
  scales: MemberScaleHistoryItemDTO[];
}

// ==========================================
// 5. TELA: CATÁLOGO DE CELEBRAÇÕES
// ==========================================
export interface CategoryDTO {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface CelebrationDTO {
  id: number;
  name: string;
  category_id: number | null;
  category?: CategoryDTO;
  created_at: string;
}

export interface CreateCelebrationRequest {
  name: string;
  category_id: number;
}

// ==========================================
// 6. TELAS: MONTAR ESCALA & CALENDÁRIO
// ==========================================
export interface CandidateMinisterDTO {
  id: number;
  name: string;
  phone: string | null;
  profile: MemberProfile;
  status: MemberStatus;
  avatar_url: string | null;
  scales_count_month: number;
  is_scheduled_same_day: boolean;
}

export interface CreateEventRequest {
  date: string;
  time: string;
  celebration_id: number;
  celebrant_id: number;
  subtitle?: string | null;
  minister_ids: number[];
}

export interface UpdateEventRequest {
  date?: string;
  time?: string;
  celebration_id?: number;
  celebrant_id?: number;
  subtitle?: string | null;
  minister_ids?: number[];
}

export interface EventDTO {
  id: number;
  date: string;
  time: string;
  subtitle: string | null;
  celebration: CelebrationDTO;
  celebrant: MemberDTO;
  user_id: number;
  ministers: MemberDTO[];
  created_at: string;
  updated_at?: string | null;
}

export interface CalendarSummaryDayDTO {
  date: string;
  events_count: number;
  celebration_names: string[];
}
```
