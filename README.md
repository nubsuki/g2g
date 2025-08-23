# G2G - Gaming Performance Prediction System

A machine learning-powered web application that predicts gaming FPS performance based on hardware benchmarks and game benchamrks. This project combines real-world benchmark data with advanced ensemble modeling to provide accurate gaming performance predictions for PC users.

## Overview

G2G (From Gamers to Gamers) is a comprehensive gaming performance prediction platform developed as a university final year project. The system leverages machine learning algorithms to predict FPS (Frames Per Second) performance based on user hardware specifications and game requirements.

### Key Capabilities

- **FPS Prediction**: Accurate gaming performance predictions using ensemble machine learning models
- **Hardware Analysis**: Comprehensive analysis of CPU, GPU, and RAM specifications
- **Game Compatibility**: Integration with ProtonDB for Linux gaming compatibility
- **Community Features**: User profiles, and community discussions

## Features

### Web Application
- User authentication and profile management
- Interactive FPS prediction interface
- Game compatibility checking
- Admin panel for system management
- Community features and user interaction

### Machine Learning Pipeline
- Ensemble model combining XGBoost, LightGBM, and RandomForest
- Feature engineering with performance ratios and bottleneck detection
- Automated model training and evaluation
- Real-time prediction API
- Model performance tracking and statistics

### Data Management
- Automated web scraping from GeekBench and TechPowerUp
- CSV-based data storage with Firestore integration
- Data preprocessing and feature selection
- Performance benchmarking and validation

## Technology Stack

### Frontend
- **React** - Modern JavaScript framework
- **Vite** - Fast build tool and development server
- **React Router Dom** - Client-side routing
- **Firebase** - Authentication and database
- **React Icons** - Icon library

### Backend & ML
- **Python 3.10** - Core programming language
- **Flask** - Web framework for API
- **scikit-learn** - Machine learning library
- **XGBoost** - Gradient boosting framework
- **LightGBM** - Gradient boosting framework
- **pandas** - Data manipulation and analysis
- **NumPy** - Numerical computing

### Database & Storage
- **Google Firestore** - NoSQL document database
- **CSV Files** - Benchmark data storage
- **joblib** - Model serialization

### Web Automation
- **Selenium** - Web browser automation
- **requests** - HTTP library
- **webdriver-manager** - WebDriver management

## License

This project is developed for academic purposes. All rights reserved.

## Acknowledgments

- GeekBench for CPU & GPU benchmark data
- TechPowerUp for Games benchmark data
- ProtonDB for Linux gaming compatibility data

---

**Project Type**: University Final Year Development Project  
**Academic Year**: 2025  
**Technology Focus**: Machine Learning, Web Development, Data Science 