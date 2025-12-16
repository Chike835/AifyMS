-- Delete all existing recipes
-- This migration removes all recipes as part of removing raw_tracked and manufactured_virtual product types

DELETE FROM recipes;


