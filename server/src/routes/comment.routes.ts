import { Router } from "express";

import commentsController from "../controllers/comment.controller";

const baseURL: string = "/api/comments";

export const commentRoutes = (router: Router): void => {
  router.get(baseURL, commentsController.getComments);
  router.post(baseURL, commentsController.createComment);
  router.patch(baseURL, commentsController.updateComment);
  router.delete(baseURL, commentsController.deleteComment);
};
