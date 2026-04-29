export const STUDENT_EXCHANGE_TYPE = "direct";

export const STUDENT_EVENTS = {
  CREATED: {
    exchange: "academic.students.created.exchange",
    routingKey: "student.created",
  },
  UPDATED: {
    exchange: "academic.students.updated.exchange",
    routingKey: "student.updated",
  },
  DELETED: {
    exchange: "academic.students.deleted.exchange",
    routingKey: "student.deleted",
  },
} as const;
