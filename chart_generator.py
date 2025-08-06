import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class ChartGenerator:
    def __init__(self):
        self.theme = 'plotly_white'  # Colorful theme for better visibility
        self.color_palette = px.colors.qualitative.Set3
    
    def create_bar_chart(self, x_data, y_data, x_title, y_title, title=None):
        """Create an interactive bar chart"""
        try:
            if not x_data or not y_data or len(x_data) != len(y_data):
                logger.error("Invalid data for bar chart")
                return None
            
            fig = go.Figure(data=[
                go.Bar(
                    x=x_data,
                    y=y_data,
                    marker_color=self.color_palette[0],
                    text=y_data,
                    textposition='auto',
                )
            ])
            
            fig.update_layout(
                title=title or f'{y_title} by {x_title}',
                xaxis_title=x_title,
                yaxis_title=y_title,
                template=self.theme,
                height=500,
                showlegend=False
            )
            
            return fig.to_html(include_plotlyjs=False, div_id=f"chart-{hash(str(x_data))}")
            
        except Exception as e:
            logger.error(f"Error creating bar chart: {str(e)}")
            return None
    
    def create_line_chart(self, df, x_column, y_column, title=None):
        """Create an interactive line chart"""
        try:
            if x_column not in df.columns or y_column not in df.columns:
                logger.error(f"Columns {x_column} or {y_column} not found in dataframe")
                return None
            
            # Sort by x column for better line chart
            df_sorted = df.sort_values(x_column)
            
            fig = go.Figure(data=[
                go.Scatter(
                    x=df_sorted[x_column],
                    y=df_sorted[y_column],
                    mode='lines+markers',
                    line=dict(color=self.color_palette[1], width=3),
                    marker=dict(size=6)
                )
            ])
            
            fig.update_layout(
                title=title or f'{y_column} vs {x_column}',
                xaxis_title=x_column,
                yaxis_title=y_column,
                template=self.theme,
                height=500,
                showlegend=False
            )
            
            return fig.to_html(include_plotlyjs=False, div_id=f"chart-{hash(str(df_sorted[x_column].values))}")
            
        except Exception as e:
            logger.error(f"Error creating line chart: {str(e)}")
            return None
    
    def create_scatter_plot(self, df, x_column, y_column, title=None):
        """Create an interactive scatter plot"""
        try:
            if x_column not in df.columns or y_column not in df.columns:
                logger.error(f"Columns {x_column} or {y_column} not found in dataframe")
                return None
            
            # Remove rows with missing values in selected columns
            clean_df = df[[x_column, y_column]].dropna()
            
            if clean_df.empty:
                logger.error("No valid data points for scatter plot")
                return None
            
            fig = go.Figure(data=[
                go.Scatter(
                    x=clean_df[x_column],
                    y=clean_df[y_column],
                    mode='markers',
                    marker=dict(
                        color=self.color_palette[2],
                        size=8,
                        opacity=0.7
                    )
                )
            ])
            
            fig.update_layout(
                title=title or f'{y_column} vs {x_column}',
                xaxis_title=x_column,
                yaxis_title=y_column,
                template=self.theme,
                height=500,
                showlegend=False
            )
            
            return fig.to_html(include_plotlyjs=False, div_id=f"chart-{hash(str(clean_df[x_column].values))}")
            
        except Exception as e:
            logger.error(f"Error creating scatter plot: {str(e)}")
            return None
    
    def create_histogram(self, df, column, title=None):
        """Create an interactive histogram"""
        try:
            if column not in df.columns:
                logger.error(f"Column {column} not found in dataframe")
                return None
            
            # Remove missing values
            clean_data = df[column].dropna()
            
            if clean_data.empty:
                logger.error("No valid data for histogram")
                return None
            
            fig = go.Figure(data=[
                go.Histogram(
                    x=clean_data,
                    marker_color=self.color_palette[3],
                    opacity=0.8
                )
            ])
            
            fig.update_layout(
                title=title or f'Distribution of {column}',
                xaxis_title=column,
                yaxis_title='Frequency',
                template=self.theme,
                height=500,
                showlegend=False
            )
            
            return fig.to_html(include_plotlyjs=False, div_id=f"chart-{hash(str(clean_data.values))}")
            
        except Exception as e:
            logger.error(f"Error creating histogram: {str(e)}")
            return None
    
    def create_box_plot(self, df, columns, title=None):
        """Create an interactive box plot"""
        try:
            # Validate columns
            valid_columns = [col for col in columns if col in df.columns]
            
            if not valid_columns:
                logger.error("No valid columns for box plot")
                return None
            
            fig = go.Figure()
            
            for i, column in enumerate(valid_columns):
                clean_data = df[column].dropna()
                if not clean_data.empty:
                    fig.add_trace(go.Box(
                        y=clean_data,
                        name=column,
                        marker_color=self.color_palette[i % len(self.color_palette)]
                    ))
            
            fig.update_layout(
                title=title or f'Box Plot of {", ".join(valid_columns)}',
                yaxis_title='Values',
                template=self.theme,
                height=500
            )
            
            return fig.to_html(include_plotlyjs=False, div_id=f"chart-{hash(str(valid_columns))}")
            
        except Exception as e:
            logger.error(f"Error creating box plot: {str(e)}")
            return None
    
    def create_pie_chart(self, labels, values, title=None):
        """Create an interactive pie chart"""
        try:
            if not labels or not values or len(labels) != len(values):
                logger.error("Invalid data for pie chart")
                return None
            
            fig = go.Figure(data=[
                go.Pie(
                    labels=labels,
                    values=values,
                    marker_colors=self.color_palette[:len(labels)]
                )
            ])
            
            fig.update_layout(
                title=title or 'Distribution',
                template=self.theme,
                height=500
            )
            
            return fig.to_html(include_plotlyjs=False, div_id=f"chart-{hash(str(labels))}")
            
        except Exception as e:
            logger.error(f"Error creating pie chart: {str(e)}")
            return None
