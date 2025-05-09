import { Request, Response } from "express";

import Container from "../containers";
import { asyncHandler } from "../utils/asyncHandler";
import { User, Users } from "../types/user.type";
import {
  FetchUserUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  Queries,
  Body,
} from "../use-cases/user.use-case";
import { cache } from "../config/lru";

type ResponseBody<DataType> = {
  data: DataType;
  message: string;
};

class UserController {
  constructor(private readonly container = Container()) {}

  public getUsers = asyncHandler(
    async (
      req: Request<any, User | User, any, Queries>,
      res: Response<ResponseBody<User | Users>>
    ) => {
      const fetchUserUseCase = this.container.get(FetchUserUseCase);
      const data: User | Users = await fetchUserUseCase.execute(req.query);

      let responseMessage: string = "Fetch success.";
      const cachedKey: string = req.query.id ?? req.query.email!;

      // If query is provided and a cached user was fetched - reflect that in the response and send a specific header..
      if (cachedKey && cache.has(cachedKey)) {
        responseMessage += " (cached)";
        res.setHeader("X-Cache-Status", "HIT");
      } else {
        res.setHeader("X-Cache-Status", "MISS");
        cache.set(cachedKey, data); // Cache the user.
      }

      res.status(200).json({ data, message: responseMessage }).end();
    }
  );

  public updateUser = asyncHandler(
    async (
      req: Request<any, User, Body, Queries>,
      res: Response<ResponseBody<User>>
    ) => {
      const updateUserUseCase = this.container.get(UpdateUserUseCase);
      const data: User = await updateUserUseCase.execute(req.query, req.body);
      res.status(200).json({ data, message: "Update success." }).end();
    }
  );

  public deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const deleteUserUseCase = this.container.get(DeleteUserUseCase);
    const data: User = await deleteUserUseCase.execute(req.query);
    res.status(200).json({ data, message: "Deletion success." }).end();
  });
}

export default new UserController();
