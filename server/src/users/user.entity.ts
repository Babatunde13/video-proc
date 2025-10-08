import { ApiProperty } from "@nestjs/swagger";

export class User {
  constructor(data: Partial<User>) {
    for (const key in data) {
      this[key] = data[key];
    }
  }

  id: string;
  email: string;
  name: string;
  password: string;
  created_at: Date;
  updated_at?: Date;

  toJSON(): UserClient {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

export class UserClient {
  @ApiProperty({
    title: "id",
    description: "ID of the user",
    required: true,
    readOnly: true,
  })
  id: string;

  @ApiProperty({
    title: "email",
    description: "Email of the user",
    required: true,
    readOnly: true,
  })
  email: string;

  @ApiProperty({
    title: "name",
    description: "Name of the user",
    required: true,
    readOnly: true,
  })
  name: string;

  @ApiProperty({
    title: "created_at",
    description: "Creation date of the user",
    required: true,
    readOnly: true,
  })
  created_at: Date;

  @ApiProperty({
    title: "updated_at",
    description: "Last updated at date of the user",
    required: true,
    readOnly: true,
  })
  updated_at?: Date;
}
