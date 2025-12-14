-- Add body_type field to cars table for categorization
-- This enables filtering by SUV, Sedan, Coupe, Hatchback, Truck, Van

ALTER TABLE cars
ADD COLUMN IF NOT EXISTS body_type VARCHAR(50);

-- Add index for faster filtering by body type
CREATE INDEX IF NOT EXISTS idx_cars_body_type
ON cars(body_type)
WHERE body_type IS NOT NULL;

-- Update existing cars with intelligent categorization based on model names
-- This is a best-guess categorization - admin can correct as needed

UPDATE cars
SET body_type = CASE
  -- SUVs
  WHEN LOWER(model) LIKE '%suv%' OR LOWER(model) LIKE '%g-class%' OR LOWER(model) LIKE '%g class%'
    OR LOWER(model) LIKE '%gle%' OR LOWER(model) LIKE '%glc%' OR LOWER(model) LIKE '%gls%'
    OR LOWER(model) LIKE '%x%' OR LOWER(model) LIKE '%range rover%' OR LOWER(model) LIKE '%land cruiser%'
    OR LOWER(model) LIKE '%4runner%' OR LOWER(model) LIKE '%highlander%' OR LOWER(model) LIKE '%prado%'
    OR LOWER(model) LIKE '%escalade%' OR LOWER(model) LIKE '%navigator%' OR LOWER(model) LIKE '%qx%'
    OR LOWER(model) LIKE '%gx%' OR LOWER(model) LIKE '%lx%' OR LOWER(model) LIKE '%rx%'
    OR LOWER(model) LIKE '%cayenne%' OR LOWER(model) LIKE '%macan%' OR LOWER(model) LIKE '%urus%'
    OR LOWER(make) = 'jeep' OR LOWER(model) LIKE '%wrangler%' OR LOWER(model) LIKE '%cherokee%'
  THEN 'SUV'

  -- Sedans
  WHEN LOWER(model) LIKE '%sedan%' OR LOWER(model) LIKE '%c-class%' OR LOWER(model) LIKE '%c class%'
    OR LOWER(model) LIKE '%e-class%' OR LOWER(model) LIKE '%e class%' OR LOWER(model) LIKE '%s-class%'
    OR LOWER(model) LIKE '%camry%' OR LOWER(model) LIKE '%accord%' OR LOWER(model) LIKE '%civic%'
    OR LOWER(model) LIKE '%corolla%' OR LOWER(model) LIKE '%altima%' OR LOWER(model) LIKE '%maxima%'
    OR LOWER(model) LIKE '%330%' OR LOWER(model) LIKE '%530%' OR LOWER(model) LIKE '%540%' OR LOWER(model) LIKE '%740%'
    OR LOWER(model) LIKE '%a4%' OR LOWER(model) LIKE '%a6%' OR LOWER(model) LIKE '%a8%'
    OR LOWER(model) LIKE '%panamera%' OR LOWER(model) LIKE '%continental%'
  THEN 'Sedan'

  -- Coupes
  WHEN LOWER(model) LIKE '%coupe%' OR LOWER(model) LIKE '%amg gt%' OR LOWER(model) LIKE '%911%'
    OR LOWER(model) LIKE '%r8%' OR LOWER(model) LIKE '%corvette%' OR LOWER(model) LIKE '%mustang%'
    OR LOWER(model) LIKE '%camaro%' OR LOWER(model) LIKE '%challenger%' OR LOWER(model) LIKE '%m2%'
    OR LOWER(model) LIKE '%m4%' OR LOWER(model) LIKE '%rc%' OR LOWER(model) LIKE '%lc%'
  THEN 'Coupe'

  -- Trucks
  WHEN LOWER(model) LIKE '%truck%' OR LOWER(model) LIKE '%pickup%' OR LOWER(model) LIKE '%f-150%'
    OR LOWER(model) LIKE '%f-250%' OR LOWER(model) LIKE '%f-350%' OR LOWER(model) LIKE '%ram%'
    OR LOWER(model) LIKE '%silverado%' OR LOWER(model) LIKE '%sierra%' OR LOWER(model) LIKE '%tacoma%'
    OR LOWER(model) LIKE '%tundra%' OR LOWER(model) LIKE '%titan%' OR LOWER(model) LIKE '%frontier%'
    OR LOWER(model) LIKE '%ranger%' OR LOWER(model) LIKE '%colorado%'
  THEN 'Truck'

  -- Vans/Minivans
  WHEN LOWER(model) LIKE '%van%' OR LOWER(model) LIKE '%sienna%' OR LOWER(model) LIKE '%odyssey%'
    OR LOWER(model) LIKE '%pacifica%' OR LOWER(model) LIKE '%caravan%' OR LOWER(model) LIKE '%quest%'
    OR LOWER(model) LIKE '%metris%' OR LOWER(model) LIKE '%sprinter%'
  THEN 'Van'

  -- Hatchbacks
  WHEN LOWER(model) LIKE '%hatchback%' OR LOWER(model) LIKE '%golf%' OR LOWER(model) LIKE '%focus%'
    OR LOWER(model) LIKE '%fiesta%' OR LOWER(model) LIKE '%yaris%' OR LOWER(model) LIKE '%fit%'
    OR LOWER(model) LIKE '%veloster%' OR LOWER(model) LIKE '%i30%'
  THEN 'Hatchback'

  -- Convertibles
  WHEN LOWER(model) LIKE '%convertible%' OR LOWER(model) LIKE '%roadster%' OR LOWER(model) LIKE '%cabriolet%'
    OR LOWER(model) LIKE '%spyder%'
  THEN 'Convertible'

  -- Default to Sedan if unclear
  ELSE 'Sedan'
END
WHERE body_type IS NULL;

-- Verify the update
SELECT body_type, COUNT(*) as car_count
FROM cars
GROUP BY body_type
ORDER BY car_count DESC;
