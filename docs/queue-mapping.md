# Plano: Arquitetura de Exchanges e Filas RabbitMQ por Microserviço

## Contexto

Cada evento possui sua própria exchange (direct). O publicador cria e gerencia suas exchanges; o consumidor cria suas próprias filas e define os bindings com a exchange do publicador.

## Convenção de Nomenclatura

| Elemento    | Padrão                                               | Exemplo                                         |
|-------------|-----------------------------------------------------|-------------------------------------------------|
| Exchange    | `{producer-service}.{event}.exchange`                | `academic.students.created.exchange`            |
| Fila        | `{consumer-service}.{producer-service}.{event}.queue`| `enrollment.academic-students.created.queue`    |
| Routing Key | `{entity}.{action}`                                  | `student.created`                               |

**Regras:** separador lógico: `.` (ponto) · separador em nomes compostos: `-` (hífen) · tudo lowercase

---

## Responsabilidades por Microserviço

---

### academic.students

**Cria como publicador:**

| Exchange | Routing Key |
|----------|-------------|
| `academic.students.created.exchange` | `student.created` |
| `academic.students.updated.exchange` | `student.updated` |
| `academic.students.deleted.exchange` | `student.deleted` |

---

### academic.subjects

**Cria como publicador:**

| Exchange | Routing Key |
|----------|-------------|
| `academic.subjects.created.exchange` | `subject.created` |
| `academic.subjects.updated.exchange` | `subject.updated` |
| `academic.subjects.deleted.exchange` | `subject.deleted` |

---

### academic.teachers

**Cria como publicador:**

| Exchange | Routing Key |
|----------|-------------|
| `academic.teachers.created.exchange` | `teacher.created` |
| `academic.teachers.updated.exchange` | `teacher.updated` |
| `academic.teachers.deleted.exchange` | `teacher.deleted` |

**Cria como consumidor:**

| Fila | Exchange vinculada | Routing Key |
|------|--------------------|-------------|
| `academic-teachers.auth.created.queue` | `auth.created.exchange` | `user.created` |
| `academic-teachers.auth.updated.queue` | `auth.updated.exchange` | `user.updated` |
| `academic-teachers.auth.deleted.queue` | `auth.deleted.exchange` | `user.deleted` |

---

### auth

**Cria como publicador:**

| Exchange | Routing Key |
|----------|-------------|
| `auth.created.exchange` | `user.created` |
| `auth.updated.exchange` | `user.updated` |
| `auth.deleted.exchange` | `user.deleted` |

---

### class-offering

**Cria como publicador:**

| Exchange | Routing Key |
|----------|-------------|
| `class-offering.created.exchange` | `class-offering.created` |
| `class-offering.updated.exchange` | `class-offering.updated` |
| `class-offering.canceled.exchange` | `class-offering.canceled` |

**Cria como consumidor:**

| Fila | Exchange vinculada | Routing Key |
|------|--------------------|-------------|
| `class-offering.academic-subjects.created.queue` | `academic.subjects.created.exchange` | `subject.created` |
| `class-offering.academic-subjects.updated.queue` | `academic.subjects.updated.exchange` | `subject.updated` |
| `class-offering.academic-subjects.deleted.queue` | `academic.subjects.deleted.exchange` | `subject.deleted` |
| `class-offering.academic-teachers.created.queue` | `academic.teachers.created.exchange` | `teacher.created` |
| `class-offering.academic-teachers.updated.queue` | `academic.teachers.updated.exchange` | `teacher.updated` |
| `class-offering.academic-teachers.deleted.queue` | `academic.teachers.deleted.exchange` | `teacher.deleted` |

---

### enrollment

**Cria como publicador:**

| Exchange | Routing Key |
|----------|-------------|
| `enrollment.created.exchange` | `enrollment.created` |
| `enrollment.canceled.exchange` | `enrollment.canceled` |

**Cria como consumidor:**

| Fila | Exchange vinculada | Routing Key |
|------|--------------------|-------------|
| `enrollment.academic-students.created.queue` | `academic.students.created.exchange` | `student.created` |
| `enrollment.academic-students.updated.queue` | `academic.students.updated.exchange` | `student.updated` |
| `enrollment.academic-students.deleted.queue` | `academic.students.deleted.exchange` | `student.deleted` |
| `enrollment.class-offering.created.queue` | `class-offering.created.exchange` | `class-offering.created` |
| `enrollment.class-offering.updated.queue` | `class-offering.updated.exchange` | `class-offering.updated` |
| `enrollment.class-offering.canceled.queue` | `class-offering.canceled.exchange` | `class-offering.canceled` |

---

### attendance

**Cria como publicador:**

| Exchange | Routing Key |
|----------|-------------|
| `attendance.registered.exchange` | `attendance.registered` |

**Cria como consumidor:**

| Fila | Exchange vinculada | Routing Key |
|------|--------------------|-------------|
| `attendance.academic-students.created.queue` | `academic.students.created.exchange` | `student.created` |
| `attendance.academic-students.updated.queue` | `academic.students.updated.exchange` | `student.updated` |
| `attendance.academic-students.deleted.queue` | `academic.students.deleted.exchange` | `student.deleted` |
| `attendance.class-offering.created.queue` | `class-offering.created.exchange` | `class-offering.created` |
| `attendance.class-offering.updated.queue` | `class-offering.updated.exchange` | `class-offering.updated` |
| `attendance.class-offering.canceled.queue` | `class-offering.canceled.exchange` | `class-offering.canceled` |
| `attendance.enrollment.created.queue` | `enrollment.created.exchange` | `enrollment.created` |
| `attendance.enrollment.canceled.queue` | `enrollment.canceled.exchange` | `enrollment.canceled` |

---

## Mapa de Fluxo

```
academic.students.created.exchange ──► enrollment.academic-students.created.queue  (enrollment)
                                   └──► attendance.academic-students.created.queue (attendance)

academic.students.updated.exchange ──► enrollment.academic-students.updated.queue  (enrollment)
                                   └──► attendance.academic-students.updated.queue (attendance)

academic.students.deleted.exchange ──► enrollment.academic-students.deleted.queue  (enrollment)
                                   └──► attendance.academic-students.deleted.queue (attendance)

academic.subjects.*.exchange ──► class-offering.academic-subjects.*.queue (class-offering)

academic.teachers.*.exchange ──► class-offering.academic-teachers.*.queue (class-offering)

auth.*.exchange ──► academic-teachers.auth.*.queue (academic.teachers)

class-offering.*.exchange ──► enrollment.class-offering.*.queue  (enrollment)
                          └──► attendance.class-offering.*.queue (attendance)

enrollment.*.exchange ──► attendance.enrollment.*.queue (attendance)

attendance.registered.exchange ──► (sem consumidor no escopo atual)
```

> `*` representa os eventos: `created`, `updated`, `deleted`, `canceled` conforme aplicável
