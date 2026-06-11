import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";

const router: IRouter = Router();

// Root health probe — deployment platform checks GET /api
router.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

router.use(healthRouter);
router.use("/chat", chatRouter);

export default router;
