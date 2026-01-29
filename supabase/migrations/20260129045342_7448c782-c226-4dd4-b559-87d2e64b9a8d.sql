-- Create enum for classification types
CREATE TYPE public.image_classification AS ENUM ('real', 'ai_safe', 'deepfake');

-- Create enum for report status
CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- Create table to log all image analyses
CREATE TABLE public.image_analysis_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    classification image_classification NOT NULL,
    confidence NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    explanation TEXT NOT NULL,
    artifacts TEXT[] DEFAULT '{}',
    analysis_context TEXT NOT NULL, -- 'forensic_lab' or 'instagram_demo'
    image_hash TEXT, -- For duplicate detection
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for user reports on misclassifications
CREATE TABLE public.classification_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_log_id UUID REFERENCES public.image_analysis_logs(id) ON DELETE CASCADE NOT NULL,
    reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expected_classification image_classification NOT NULL,
    reason TEXT NOT NULL,
    status report_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create admin roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.image_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- RLS Policies for image_analysis_logs
CREATE POLICY "Users can view their own analysis logs"
    ON public.image_analysis_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis logs"
    ON public.image_analysis_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all analysis logs"
    ON public.image_analysis_logs FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for classification_reports
CREATE POLICY "Users can view their own reports"
    ON public.classification_reports FOR SELECT
    USING (auth.uid() = reporter_user_id);

CREATE POLICY "Users can create reports"
    ON public.classification_reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Admins can view all reports"
    ON public.classification_reports FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
    ON public.classification_reports FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_classification_reports_updated_at
    BEFORE UPDATE ON public.classification_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();