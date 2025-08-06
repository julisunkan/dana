import pandas as pd
import numpy as np
import logging
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

class DataProcessor:
    def __init__(self):
        self.max_rows = 100000
        self.encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
    
    def load_data(self, file_path):
        """Load data from CSV or Excel file with multiple encoding support"""
        try:
            file_extension = file_path.lower().split('.')[-1]
            
            if file_extension == 'csv':
                # Try different encodings for CSV
                for encoding in self.encodings:
                    try:
                        df = pd.read_csv(file_path, encoding=encoding)
                        logger.info(f"Successfully loaded CSV with {encoding} encoding")
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    logger.error("Failed to load CSV with any encoding")
                    return None
            
            elif file_extension in ['xlsx', 'xls']:
                df = pd.read_excel(file_path)
                logger.info("Successfully loaded Excel file")
            
            else:
                logger.error(f"Unsupported file format: {file_extension}")
                return None
            
            # Validate dataframe
            if df.empty:
                logger.error("Loaded dataframe is empty")
                return None
            
            # Limit rows for performance
            if len(df) > self.max_rows:
                logger.warning(f"Dataset too large ({len(df)} rows). Limiting to {self.max_rows} rows")
                df = df.head(self.max_rows)
            
            return df
            
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            return None
    
    def get_basic_stats(self, df):
        """Get basic statistics about the dataframe"""
        try:
            stats = {
                'shape': df.shape,
                'columns': list(df.columns),
                'dtypes': df.dtypes.to_dict(),
                'missing_values': df.isnull().sum().to_dict(),
                'duplicate_rows': df.duplicated().sum(),
                'memory_usage': df.memory_usage(deep=True).sum(),
                'numeric_columns': list(df.select_dtypes(include=[np.number]).columns),
                'categorical_columns': list(df.select_dtypes(include=['object']).columns),
                'datetime_columns': list(df.select_dtypes(include=['datetime64']).columns)
            }
            
            # Add descriptive statistics for numeric columns
            if stats['numeric_columns']:
                stats['describe'] = df[stats['numeric_columns']].describe().to_dict()
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting basic stats: {str(e)}")
            return {}
    
    def get_data_quality_info(self, df):
        """Get detailed data quality information"""
        try:
            quality_info = {
                'total_rows': len(df),
                'total_columns': len(df.columns),
                'missing_data': {},
                'duplicate_rows': df.duplicated().sum(),
                'data_types': df.dtypes.to_dict(),
                'outliers': {}
            }
            
            # Missing data analysis
            for col in df.columns:
                missing_count = df[col].isnull().sum()
                if missing_count > 0:
                    quality_info['missing_data'][col] = {
                        'count': int(missing_count),
                        'percentage': round((missing_count / len(df)) * 100, 2)
                    }
            
            # Outlier detection for numeric columns
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            for col in numeric_columns:
                if df[col].notna().sum() > 10:  # Need at least 10 non-null values
                    try:
                        # Use IQR method for outlier detection
                        Q1 = df[col].quantile(0.25)
                        Q3 = df[col].quantile(0.75)
                        IQR = Q3 - Q1
                        lower_bound = Q1 - 1.5 * IQR
                        upper_bound = Q3 + 1.5 * IQR
                        
                        outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)][col]
                        
                        if len(outliers) > 0:
                            quality_info['outliers'][col] = {
                                'count': len(outliers),
                                'percentage': round((len(outliers) / len(df)) * 100, 2),
                                'lower_bound': lower_bound,
                                'upper_bound': upper_bound
                            }
                    except Exception as e:
                        logger.warning(f"Could not detect outliers for {col}: {str(e)}")
            
            return quality_info
            
        except Exception as e:
            logger.error(f"Error getting data quality info: {str(e)}")
            return {}
    
    def handle_missing_values(self, df, strategy='drop'):
        """Handle missing values in the dataframe"""
        try:
            if strategy == 'drop':
                return df.dropna()
            elif strategy == 'fill_mean':
                numeric_columns = df.select_dtypes(include=[np.number]).columns
                df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].mean())
                return df
            elif strategy == 'fill_median':
                numeric_columns = df.select_dtypes(include=[np.number]).columns
                df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].median())
                return df
            elif strategy == 'fill_mode':
                for col in df.columns:
                    if df[col].dtype == 'object':
                        df[col] = df[col].fillna(df[col].mode().iloc[0] if not df[col].mode().empty else 'Unknown')
                return df
            else:
                return df
                
        except Exception as e:
            logger.error(f"Error handling missing values: {str(e)}")
            return df
    
    def remove_duplicates(self, df):
        """Remove duplicate rows from the dataframe"""
        try:
            initial_count = len(df)
            df_clean = df.drop_duplicates()
            removed_count = initial_count - len(df_clean)
            logger.info(f"Removed {removed_count} duplicate rows")
            return df_clean
            
        except Exception as e:
            logger.error(f"Error removing duplicates: {str(e)}")
            return df
    
    def remove_outliers(self, df):
        """Remove outliers using Isolation Forest"""
        try:
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            
            if len(numeric_columns) == 0:
                logger.warning("No numeric columns found for outlier removal")
                return df
            
            # Use only numeric columns with sufficient data
            valid_columns = []
            for col in numeric_columns:
                if df[col].notna().sum() > 10:
                    valid_columns.append(col)
            
            if not valid_columns:
                logger.warning("No valid numeric columns for outlier detection")
                return df
            
            # Prepare data for outlier detection
            data_for_outliers = df[valid_columns].dropna()
            
            if len(data_for_outliers) < 10:
                logger.warning("Insufficient data for outlier detection")
                return df
            
            # Apply Isolation Forest
            iso_forest = IsolationForest(contamination=0.1, random_state=42)
            outlier_labels = iso_forest.fit_predict(data_for_outliers)
            
            # Get indices of non-outliers
            non_outlier_indices = data_for_outliers.index[outlier_labels == 1]
            
            # Filter original dataframe
            df_clean = df.loc[non_outlier_indices]
            
            removed_count = len(df) - len(df_clean)
            logger.info(f"Removed {removed_count} outlier rows using Isolation Forest")
            
            return df_clean
            
        except Exception as e:
            logger.error(f"Error removing outliers: {str(e)}")
            return df
