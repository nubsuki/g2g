# G2G - Gaming Performance Prediction System

A machine learning-powered web application that predicts gaming FPS performance based on hardware specifications. This project combines real-world benchmark data with advanced ensemble modeling to provide accurate gaming performance predictions for PC users.

## Overview

G2G (From Gamers to Gamers) is a comprehensive gaming performance prediction platform developed as a university final year project. The system leverages machine learning algorithms to predict FPS (Frames Per Second) performance based on user hardware specifications and game requirements.

### Key Capabilities

- **FPS Prediction**: Accurate gaming performance predictions using ensemble machine learning models
- **Hardware Analysis**: Comprehensive analysis of CPU, GPU, and RAM specifications
- **Game Compatibility**: Integration with ProtonDB for Linux gaming compatibility
- **Community Features**: User profiles, performance sharing, and community discussions
- **Real-time Data**: Automated web scraping for up-to-date benchmark information

## Features

### Web Application
- User authentication and profile management
- Interactive FPS prediction interface
- Game compatibility checking
- Performance history tracking
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

### Web Scraping & Automation
- **Selenium** - Web browser automation
- **requests** - HTTP library
- **webdriver-manager** - WebDriver management

## Usage

### Web Application

1. **User Registration**: Create an account using email and password
2. **Profile Setup**: Add your hardware specifications (CPU, GPU, RAM)
3. **Game Selection**: Choose a game from the database
4. **FPS Prediction**: Get predicted performance based on your hardware
5. **Results Analysis**: View detailed performance breakdowns and recommendations


## Machine Learning Model

### Model Architecture
The system uses an ensemble approach combining three powerful algorithms:
- **XGBoost Regressor** - Gradient boosting with optimized performance
- **LightGBM Regressor** - Fast gradient boosting framework
- **Random Forest Regressor** - Ensemble of decision trees

### Feature Engineering
- Hardware performance ratios (CPU/GPU score ratios)
- Bottleneck detection algorithms
- Memory efficiency calculations
- Resolution and pixel density features
- Performance indices for comprehensive hardware evaluation

### Model Performance
- **Mean Absolute Error (MAE)**: Typically < 10 FPS
- **R² Score**: > 0.85 on validation data
- **Cross-validation**: 5-fold CV for robust evaluation

## Data Sources

### Benchmark Data
- **GeekBench**: CPU performance benchmarks
- **TechPowerUp**: GPU performance benchmarks
- **Game Requirements**: Minimum specifications
- **Performance Benchmarks**: Real-world gaming performance data

### Data Collection
- Automated web scraping with Selenium
- Data validation and cleaning pipelines
- Regular updates to maintain accuracy
- Manual curation for quality assurance



## Academic Context

This project represents a comprehensive full-stack application developed for university assessment, demonstrating:

- **Software Engineering**: Full-stack web development with modern frameworks
- **Machine Learning**: Advanced ensemble modeling and feature engineering
- **Data Science**: Web scraping, data preprocessing, and analysis
- **Cloud Computing**: Firebase and Google Cloud Platform integration
- **User Experience**: Responsive design and intuitive interfaces

## License

This project is developed for academic purposes. All rights reserved.

## Acknowledgments

- GeekBench for CPU benchmark data
- TechPowerUp for GPU benchmark data
- ProtonDB for Linux gaming compatibility data
- Open source community for frameworks and libraries used

---

**Project Type**: University Final Year Development Project  
**Academic Year**: 2025  
**Technology Focus**: Machine Learning, Web Development, Data Science 