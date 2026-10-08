import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresá un correo válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

export const recuperarSchema = z.object({
  email: z.string().trim().email("Ingresá un correo válido."),
});
