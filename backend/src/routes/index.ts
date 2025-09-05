import { Router } from 'express';
export const mainRouter = Router();

// Temporary root endpoint
mainRouter.get('/', (req, res) => {
  res.json({ message: 'Hello from FamilySpace API!' });
});