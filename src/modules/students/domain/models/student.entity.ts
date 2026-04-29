export class Student {
  private readonly _id?: string;
  private _name: string;
  private _email: string;
  private _document: string;
  private _registration: string;
  private readonly _createdAt?: Date;
  private readonly _updatedAt?: Date;

  private constructor(id?: string, createdAt?: Date, updatedAt?: Date) {
    this._id = id;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get id(): string | undefined {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get email(): string {
    return this._email;
  }

  get document(): string {
    return this._document;
  }

  get registration(): string {
    return this._registration;
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  withName(name: string) {
    this._name = name;
    return this;
  }

  withEmail(email: string) {
    this._email = email;
    return this;
  }

  withDocument(document: string) {
    this._document = document;
    return this;
  }

  withRegistration(registration: string) {
    this._registration = registration;
    return this;
  }

  static restore(props?: {
    id?: string;
    name: string;
    email: string;
    document: string;
    registration: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Student | null {
    if (!props) return null;

    const student = new Student(props.id, props.createdAt, props.updatedAt);

    student._name = props.name;
    student._email = props.email;
    student._document = props.document;
    student._registration = props.registration;

    return student;
  }
}
