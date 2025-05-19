import { Application } from "@oak/oak";
import authRouter from "./auth/router.ts";
import organizationRouter from "./organization/router.ts";
import projectRouter from "./project/router.ts";

const api = new Application();

api.use(authRouter.prefix("/auth").routes());
api.use(authRouter.allowedMethods());

api.use(organizationRouter.prefix("/organizations").routes());
api.use(organizationRouter.allowedMethods());

api.use(projectRouter.prefix("/projects").routes());
api.use(projectRouter.allowedMethods());

export default api;
