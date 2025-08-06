import os
import json
import pandas as pd
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ExportHandler:
    def __init__(self):
        self.supported_formats = ['csv', 'xlsx', 'json']
    
    def export_data(self, df, format, export_folder):
        """Export dataframe to specified format"""
        try:
            if format not in self.supported_formats:
                logger.error(f"Unsupported export format: {format}")
                return None
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"exported_data_{timestamp}.{format}"
            filepath = os.path.join(export_folder, filename)
            
            if format == 'csv':
                df.to_csv(filepath, index=False)
            elif format == 'xlsx':
                df.to_excel(filepath, index=False, engine='openpyxl')
            elif format == 'json':
                df.to_json(filepath, orient='records', indent=2)
            
            logger.info(f"Data exported to {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error exporting data: {str(e)}")
            return None
    
    def export_summary_report(self, df, export_folder):
        """Export comprehensive summary report"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"data_analysis_report_{timestamp}.xlsx"
            filepath = os.path.join(export_folder, filename)
            
            with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
                # Sheet 1: Original Data Sample
                df.head(1000).to_excel(writer, sheet_name='Data Sample', index=False)
                
                # Sheet 2: Basic Statistics
                stats_df = self._create_stats_dataframe(df)
                stats_df.to_excel(writer, sheet_name='Statistics', index=True)
                
                # Sheet 3: Data Quality Report
                quality_df = self._create_quality_dataframe(df)
                quality_df.to_excel(writer, sheet_name='Data Quality', index=False)
                
                # Sheet 4: Column Information
                column_info_df = self._create_column_info_dataframe(df)
                column_info_df.to_excel(writer, sheet_name='Column Info', index=False)
            
            logger.info(f"Summary report exported to {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error creating summary report: {str(e)}")
            return None
    
    def _create_stats_dataframe(self, df):
        """Create statistics dataframe for export"""
        try:
            numeric_columns = df.select_dtypes(include=['number']).columns
            
            if len(numeric_columns) == 0:
                return pd.DataFrame({'Message': ['No numeric columns found']})
            
            stats = df[numeric_columns].describe()
            return stats
            
        except Exception as e:
            logger.error(f"Error creating stats dataframe: {str(e)}")
            return pd.DataFrame({'Error': [str(e)]})
    
    def _create_quality_dataframe(self, df):
        """Create data quality dataframe for export"""
        try:
            quality_data = []
            
            for column in df.columns:
                missing_count = df[column].isnull().sum()
                missing_percentage = (missing_count / len(df)) * 100
                unique_count = df[column].nunique()
                data_type = str(df[column].dtype)
                
                quality_data.append({
                    'Column': column,
                    'Data Type': data_type,
                    'Total Values': len(df),
                    'Missing Values': missing_count,
                    'Missing Percentage': round(missing_percentage, 2),
                    'Unique Values': unique_count,
                    'Uniqueness Percentage': round((unique_count / len(df)) * 100, 2)
                })
            
            return pd.DataFrame(quality_data)
            
        except Exception as e:
            logger.error(f"Error creating quality dataframe: {str(e)}")
            return pd.DataFrame({'Error': [str(e)]})
    
    def _create_column_info_dataframe(self, df):
        """Create column information dataframe for export"""
        try:
            column_data = []
            
            for column in df.columns:
                col_info = {
                    'Column Name': column,
                    'Data Type': str(df[column].dtype),
                    'Non-Null Count': df[column].count(),
                    'Null Count': df[column].isnull().sum(),
                    'Memory Usage (bytes)': df[column].memory_usage(deep=True)
                }
                
                if df[column].dtype in ['object']:
                    # For categorical/text columns
                    col_info['Sample Values'] = ', '.join(df[column].dropna().astype(str).unique()[:5])
                elif df[column].dtype in ['int64', 'float64']:
                    # For numeric columns
                    col_info['Min Value'] = df[column].min()
                    col_info['Max Value'] = df[column].max()
                    col_info['Mean'] = round(df[column].mean(), 2) if pd.notna(df[column].mean()) else 'N/A'
                
                column_data.append(col_info)
            
            return pd.DataFrame(column_data)
            
        except Exception as e:
            logger.error(f"Error creating column info dataframe: {str(e)}")
            return pd.DataFrame({'Error': [str(e)]})
