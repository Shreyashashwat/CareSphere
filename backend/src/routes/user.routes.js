import { Router } from "express";
<<<<<<< HEAD
import {  loginUser, registerUser} from "../controllers/user.controller.js";
import {getDashboardStats} from "../controllers/dashboard.controller.js"
import { verifyJwt } from "../middleware/auth.middleware.js";
import { getHistory } from "../controllers/history.controller.js";
const router =Router()
router.route("/register").post(registerUser)
router.route("/login").post(loginUser)   
router.route("/dashboard").get(verifyJwt,getDashboardStats)
router.route("/history").get(verifyJwt,getHistory)
=======
import { loginUser, registerUser, connectToDoctor, loginDoctor } from "../controllers/user.controller.js";
import { getDashboardStats } from "../controllers/dashboard.controller.js"
import { verifyJwt, doctorOnly } from "../middleware/auth.middleware.js";
import { getHistory } from "../controllers/history.controller.js";
import { getDoctorDashboard } from "../controllers/doctorDashboard.controller.js"
const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/login-doctor").post(loginDoctor)
router.route("/dashboard").get(verifyJwt, getDashboardStats)
router.route("/history").get(verifyJwt, getHistory)
router.get("/doctor/dashboard", verifyJwt, getDoctorDashboard);
router.post("/connect-doctor", verifyJwt, connectToDoctor);

>>>>>>> d21f6254 (Update user controller, routes, and frontend pages)
export default router
