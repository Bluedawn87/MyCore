# Health Tracking System

## Overview

The Health Tracking System in MyCore provides comprehensive health management capabilities for individuals and families. It integrates with the Persons module to enable health tracking on a per-person basis, allowing you to monitor health metrics, store medical records, set health goals, and manage health reminders for yourself and your family members.

## Features

### 1. Person-Integrated Health Tracking

Health tracking is activated on a per-person basis:
- Enable health tracking through the Persons module
- Track health data for multiple family members
- Each person has their own health profile and data

### 2. Health Profiles

Complete health profiles for each person including:
- **Basic Health Info**: Blood type, height, allergies, chronic conditions
- **Emergency Contact**: Quick access to emergency contact information
- **Medical Team**: Primary physician and insurance information
- **Medications**: Current medications list
- **Family History**: Medical conditions in the family
- **Lifestyle Notes**: Diet, exercise, and other lifestyle factors

### 3. Health Metrics Tracking

Track and visualize various health metrics over time:

**Supported Metrics:**
- Weight (kg)
- Blood Pressure (systolic/diastolic)
- Heart Rate (bpm)
- Body Temperature (°C)
- Blood Glucose (mg/dL)
- Oxygen Saturation (%)
- Daily Steps
- Sleep Hours

**Features:**
- Visual charts with trend lines
- Time range filtering (7 days, 30 days, 90 days, 1 year)
- Add/edit/delete metric entries
- Add notes to individual readings
- Export data for analysis

### 4. Medical Records Management

Organize and store medical documents securely:

**Record Types:**
- Lab Results
- Prescriptions
- Medical Imaging (X-rays, MRIs, etc.)
- Consultation Notes
- Vaccination Records
- Surgery/Procedure Reports
- Insurance Documents
- Other Medical Documents

**Features:**
- File upload support (PDF, JPG, PNG, DOC, DOCX)
- Categorized organization
- Quick preview and download
- Search and filter by type
- Secure storage in Supabase

### 5. Health Goals

Set and track health goals with progress monitoring:

**Goal Types:**
- Weight Loss/Gain
- Fitness Goals
- Nutrition Goals
- Medical Treatment Goals
- Mental Health Goals
- Sleep Improvement
- Custom Goals

**Features:**
- Progress tracking with visual indicators
- Target date setting
- Progress notes and updates
- Goal status management (active, paused, completed)
- Percentage completion tracking

### 6. Health Reminders

Never miss important health appointments or medications:

**Reminder Types:**
- Regular Checkups
- Medication Schedules
- Lab Tests
- Vaccinations
- Health Screenings
- Medical Appointments

**Features:**
- Recurring reminders (daily, weekly, monthly, yearly)
- Smart recommendations based on age
- Overdue tracking
- Mark as complete functionality
- Automatic next due date calculation

### 7. AI-Powered Insights (Prepared)

The system is prepared for AI integration to provide:
- Health trend analysis
- Risk assessment based on data
- Personalized recommendations
- Anomaly detection in metrics
- Predictive health insights

**AI Configuration:**
- Support for OpenAI, OpenRouter, or custom AI providers
- Secure API key storage
- Model selection options
- Privacy-focused implementation

## Getting Started

### 1. Enable Health Tracking

1. Navigate to **Persons** in the sidebar
2. Click on a person or create a new one
3. Toggle "Enable Health Tracking" in the person modal
4. Fill in basic health information (optional but recommended):
   - Blood Type
   - Height
   - Allergies (comma-separated)
   - Chronic Conditions (comma-separated)
   - Emergency Contact

### 2. Access Health Dashboard

1. Click **Health** in the sidebar
2. Select the person whose health data you want to view/manage
3. Use the tabs to navigate between different sections

### 3. Complete Health Profile

1. In the Health dashboard, click "Complete Health Profile"
2. Fill in additional information:
   - Primary Physician
   - Insurance Information
   - Current Medications
   - Family Medical History
   - Lifestyle Notes

## Usage Guide

### Recording Health Metrics

1. Go to the **Metrics** tab
2. Select the metric type you want to record
3. Click "Add Entry"
4. Enter the value, date/time, and optional notes
5. View trends in the chart above

### Uploading Medical Records

1. Go to the **Medical Records** tab
2. Click "Upload Record"
3. Select the record type
4. Fill in the details (title, date, provider)
5. Choose file to upload (optional)
6. Click "Upload Record"

### Setting Health Goals

1. Go to the **Goals** tab
2. Click "Create Goal"
3. Select goal type and fill in details
4. Set target values and dates
5. Monitor progress and add updates as needed

### Managing Reminders

1. Go to the **Reminders** tab
2. Click "Add Reminder" or view "Recommendations"
3. Set reminder type, title, and frequency
4. System will track due dates and send notifications
5. Mark as complete when done

## Best Practices

### Data Entry
- Record metrics consistently at the same time of day
- Add notes for context (e.g., "after exercise" for blood pressure)
- Upload medical records promptly after appointments

### Organization
- Use clear, descriptive titles for medical records
- Set realistic health goals with achievable targets
- Review and update reminders regularly

### Privacy & Security
- All health data is encrypted and secured
- Only accessible by authenticated users
- Medical records stored in secure cloud storage
- AI features require explicit opt-in

## Health Recommendations by Age

The system provides smart recommendations for health checkups based on age:

- **All Ages**: Annual physical, dental checkup (2x/year), eye exam
- **18+**: Blood pressure screening
- **20+**: Cholesterol testing
- **35+**: Diabetes screening
- **40+**: Mammogram (women)
- **45+**: Colonoscopy screening
- **50+**: Bone density test (women), Prostate exam (men)

## Technical Details

### Database Schema

- **persons**: Extended with health fields (blood_type, allergies, etc.)
- **health_profiles**: Detailed health profile information
- **health_metrics**: Time-series health measurement data
- **medical_records**: Document metadata and file references
- **health_goals**: Goal tracking with progress
- **health_reminders**: Reminder scheduling and tracking
- **medical_procedures**: Surgical/procedure history
- **health_ai_settings**: AI configuration per user

### Security

- Row Level Security (RLS) on all health tables
- User can only access their own health data
- Encrypted storage for sensitive information
- Secure file upload with access control

### File Storage

Medical documents are stored in Supabase Storage:
- Bucket: `medical-records`
- Path structure: `{person_id}/{timestamp}-{filename}`
- Public URL access with security through RLS

## Future Enhancements

1. **AI Health Insights**
   - Trend analysis and predictions
   - Anomaly detection
   - Personalized recommendations

2. **Integrations**
   - Wearable device data import
   - Electronic Health Record (EHR) integration
   - Lab result auto-import

3. **Advanced Features**
   - Medication interaction checking
   - Symptom tracking
   - Health risk assessments
   - Family health tree visualization

4. **Sharing & Collaboration**
   - Share records with healthcare providers
   - Family member access controls
   - Emergency access protocols

## Troubleshooting

### Common Issues

1. **Cannot upload medical records**
   - Check file size (max 50MB)
   - Ensure file type is supported
   - Verify storage bucket exists

2. **Metrics not showing in chart**
   - Ensure data points exist in selected time range
   - Check metric type selection
   - Refresh the page

3. **Reminders not updating**
   - Verify reminder frequency is set correctly
   - Check if reminder was marked as completed
   - Ensure due date is in the future

### Support

For additional help or feature requests, please refer to the main documentation or contact support.