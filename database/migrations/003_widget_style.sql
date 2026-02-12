-- Add widget customization columns to websites table
ALTER TABLE websites 
ADD COLUMN widget_style TEXT DEFAULT 'modern' CHECK (widget_style IN ('modern', 'neutral')),
ADD COLUMN widget_subtitle TEXT DEFAULT 'We reply instantly',
ADD COLUMN widget_welcome_title TEXT DEFAULT 'Hi there! 👋',
ADD COLUMN widget_welcome_message TEXT DEFAULT 'How can we help you today?';

-- Update existing websites to have default values
UPDATE websites 
SET widget_style = 'modern',
    widget_subtitle = 'We reply instantly',
    widget_welcome_title = 'Hi there! 👋',
    widget_welcome_message = 'How can we help you today?'
WHERE widget_style IS NULL;
