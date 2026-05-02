import { Router } from "express";
import { patchStorySeen } from "./stories.controller";
import { validateBody, validateParams } from "../../middlewares/validate.middleware";
import { patchSeenBodySchema } from "./stories.schema";
import { z } from "zod";

const storyIdParamsSchema = z.object({
  storyId: z.string().min(1),
});

export const storiesRouter = Router();

storiesRouter.patch(
  "/:storyId/seen",
  validateParams(storyIdParamsSchema),
  validateBody(patchSeenBodySchema),
  patchStorySeen,
);
