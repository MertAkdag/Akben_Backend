import { Router } from "express";
import { listStoryGroups, getStoryGroup } from "./story-groups.controller";
import { validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { z } from "zod";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
});

const groupIdParamsSchema = z.object({
  groupId: z.string().min(1),
});

export const storyGroupsRouter = Router();

// GET /story-groups — listeleme (dokümantasyon: GET /story-groups)
storyGroupsRouter.get("/", validateQuery(listQuerySchema), listStoryGroups);

// GET /story-groups/:groupId — tekil grup (dokümantasyon: GET /story-groups/:groupId)
storyGroupsRouter.get("/:groupId", validateParams(groupIdParamsSchema), getStoryGroup);
