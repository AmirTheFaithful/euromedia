import { injectable, inject } from "inversify";
import { z } from "zod";

import UserService from "../services/user.service";
import { BadRequestError, NotFoundError } from "../errors/http-errors";
import { User, Users, UpdateUserDTO } from "../types/user.type";
import { UserQueries } from "../types/queries.type";
import { APIUseCase } from "./APIUseCase";
import { cache } from "../config/lru";
import { UpdateUserRequestBody } from "../types/api.type";

abstract class UserUseCase extends APIUseCase {
  protected validateEmail(email: string): never | string {
    const emailRegEx: RegExp =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegEx.test(email)) {
      throw new BadRequestError(`Invalid email "${email}"`);
    }

    return email;
  }
}

@injectable()
export class FetchUserUseCase extends UserUseCase {
  constructor(@inject(UserService) private readonly service: UserService) {
    super();
  }

  public async execute(input: UserQueries) {
    const { id, email } = input;

    if (id) {
      return await this.getById(id);
    }

    if (email) {
      return await this.getByEmail(email);
    }

    return await this.getAll();
  }

  private async getById(query: string): Promise<never | User> {
    const id = this.validateObjectId(query);
    let user: User | null = cache.get(query);

    if (!user) user = await this.service.getUserById(id);

    if (!user) {
      throw new NotFoundError(`User with id "${id}" does not exist.`);
    }

    return user;
  }

  private async getByEmail(email: string): Promise<never | User> {
    email = this.validateEmail(email);
    let user: User | null = cache.get(email);

    if (!user) user = await this.service.getUserByEmail(email);

    if (!user) {
      throw new NotFoundError();
    }

    return user;
  }

  private async getAll(): Promise<User | Users> {
    const users: Users = await this.service.getAllUsers();
    return users;
  }
}

@injectable()
export class UpdateUserUseCase extends UserUseCase {
  private readonly updateSchema = z
    .object({
      firstname: z.string().optional(),
      lastname: z.string().optional(),
      password: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
    })
    .strict();

  private mapToUpdateStructure(flat: UpdateUserDTO): UpdateUserRequestBody {
    const result: UpdateUserRequestBody = {};

    if (flat.firstname || flat.lastname) {
      result.meta = {
        firstname: flat.firstname,
        lastname: flat.lastname,
      };
    }

    if (flat.password) {
      result.auth = {
        password: flat.password,
      };
    }

    if (flat.city || flat.country) {
      result.location = {
        city: flat.city,
        country: flat.country,
      };
    }

    return result;
  }

  constructor(@inject(UserService) private readonly service: UserService) {
    super();
  }

  public async execute(queries: UserQueries, body: UpdateUserDTO) {
    const { id, email }: UserQueries = queries;
    const flatUpdateData: UpdateUserDTO = this.updateSchema.parse(body);
    const updateData: UpdateUserRequestBody =
      this.mapToUpdateStructure(flatUpdateData);

    let updatedUser: User | null = null;

    if (id) {
      const validId = this.validateObjectId(id);
      updatedUser = await this.service.updateUserById(validId, updateData);
    } else if (email) {
      const validEmail = this.validateEmail(email);
      updatedUser = await this.service.updateUserByEmail(
        validEmail,
        updateData
      );
    } else {
      throw new BadRequestError("No query is provided.");
    }

    if (!updatedUser) {
      throw new NotFoundError();
    }

    await updatedUser.save();
    return updatedUser;
  }
}

@injectable()
export class DeleteUserUseCase extends UserUseCase {
  constructor(@inject(UserService) private readonly service: UserService) {
    super();
  }

  public async execute(query: UserQueries): Promise<User> {
    const { id, email }: UserQueries = query;

    let user: User | null = null;
    if (id) {
      const validId = this.validateObjectId(id);
      user = await this.service.deleteUserById(validId);
    } else if (email) {
      const validEmail = this.validateEmail(email);
      user = await this.service.deleteUserByEmail(validEmail);
    } else {
      throw new BadRequestError("No query is provided.");
    }

    if (!user) {
      throw new NotFoundError("User not found.");
    }

    return user;
  }
}
