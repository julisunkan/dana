import os
import uuid
import logging
from flask import render_template, request, redirect, url_for, flash, session, send_file, jsonify
from werkzeug.utils import secure_filename
from app import app
from data_processor import DataProcessor
from chart_generator import ChartGenerator
from export_handler import ExportHandler

logger = logging.getLogger(__name__)

# Initialize processors
data_processor = DataProcessor()
try:
    chart_generator = ChartGenerator()
except ImportError as e:
    logger.error(f"Error importing chart generator: {e}")
    chart_generator = None
export_handler = ExportHandler()

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file selected', 'error')
            return redirect(request.url)
        
        file = request.files['file']
        if file.filename == '':
            flash('No file selected', 'error')
            return redirect(request.url)
        
        if file and allowed_file(file.filename):
            try:
                # Generate unique filename
                if file.filename is None:
                    flash('Invalid file name', 'error')
                    return redirect(request.url)
                
                original_filename = secure_filename(file.filename)
                file_extension = original_filename.rsplit('.', 1)[1].lower()
                unique_filename = f"{uuid.uuid4()}.{file_extension}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                
                # Save file
                file.save(file_path)
                
                # Store in session
                session['current_file'] = unique_filename
                session['original_filename'] = original_filename
                
                flash('File uploaded successfully!', 'success')
                return redirect(url_for('preview'))
                
            except Exception as e:
                logger.error(f"Upload error: {str(e)}")
                flash('Error uploading file. Please try again.', 'error')
                return redirect(request.url)
        else:
            flash('Invalid file type. Please upload CSV or Excel files only.', 'error')
    
    return render_template('upload.html')

@app.route('/preview')
def preview():
    if 'current_file' not in session:
        flash('No file uploaded. Please upload a file first.', 'error')
        return redirect(url_for('upload'))
    
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        df = data_processor.load_data(file_path)
        
        if df is None:
            flash('Error loading file. Please try uploading again.', 'error')
            return redirect(url_for('upload'))
        
        # Get basic statistics
        stats = data_processor.get_basic_stats(df)
        
        # Store dataframe info in session
        session['data_shape'] = df.shape
        session['columns'] = list(df.columns)
        
        # Get preview data (first 20 rows)
        preview_data = df.head(20).to_dict('records')
        
        return render_template('preview.html', 
                             data=preview_data, 
                             columns=df.columns, 
                             stats=stats,
                             filename=session.get('original_filename', 'Unknown'))
        
    except Exception as e:
        logger.error(f"Preview error: {str(e)}")
        flash('Error previewing file. Please try uploading again.', 'error')
        return redirect(url_for('upload'))

@app.route('/clean', methods=['GET', 'POST'])
def clean():
    if 'current_file' not in session:
        flash('No file uploaded. Please upload a file first.', 'error')
        return redirect(url_for('upload'))
    
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        df = data_processor.load_data(file_path)
        
        if df is None:
            flash('Error loading file. Please try uploading again.', 'error')
            return redirect(url_for('upload'))
        
        if request.method == 'POST':
            # Apply cleaning operations based on form data
            clean_options = request.form.to_dict()
            
            if 'remove_duplicates' in clean_options:
                df = data_processor.remove_duplicates(df)
            
            if 'handle_missing' in clean_options:
                missing_strategy = clean_options.get('missing_strategy', 'drop')
                df = data_processor.handle_missing_values(df, strategy=missing_strategy)
            
            if 'remove_outliers' in clean_options:
                df = data_processor.remove_outliers(df)
            
            # Save cleaned data
            cleaned_filename = f"cleaned_{session['current_file']}"
            cleaned_path = os.path.join(app.config['UPLOAD_FOLDER'], cleaned_filename)
            
            if session['current_file'].endswith('.csv'):
                df.to_csv(cleaned_path, index=False)
            else:
                df.to_excel(cleaned_path, index=False)
            
            session['current_file'] = cleaned_filename
            flash('Data cleaned successfully!', 'success')
            return redirect(url_for('dashboard'))
        
        # Get data quality info
        quality_info = data_processor.get_data_quality_info(df)
        
        return render_template('clean.html', 
                             quality_info=quality_info,
                             filename=session.get('original_filename', 'Unknown'))
        
    except Exception as e:
        logger.error(f"Clean error: {str(e)}")
        flash('Error during data cleaning. Please try again.', 'error')
        return redirect(url_for('preview'))

@app.route('/dashboard')
def dashboard():
    if 'current_file' not in session:
        flash('No file uploaded. Please upload a file first.', 'error')
        return redirect(url_for('upload'))
    
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        df = data_processor.load_data(file_path)
        
        if df is None:
            flash('Error loading file. Please try uploading again.', 'error')
            return redirect(url_for('upload'))
        
        # Get basic statistics
        stats = data_processor.get_basic_stats(df)
        
        # Generate charts for numeric columns
        charts = []
        numeric_columns = df.select_dtypes(include=['number']).columns
        categorical_columns = df.select_dtypes(include=['object']).columns
        
        # Only create charts if chart_generator is available
        if chart_generator is not None:
            # Create various chart types
            if len(numeric_columns) > 0:
                # Histogram for first numeric column
                try:
                    hist_chart = chart_generator.create_histogram(df, numeric_columns[0])
                    if hist_chart:
                        charts.append({
                            'title': f'Distribution of {numeric_columns[0]}',
                            'chart': hist_chart,
                            'type': 'histogram'
                        })
                except Exception as e:
                    logger.error(f"Error creating histogram: {e}")
                
                # Box plot for numeric columns
                if len(numeric_columns) >= 1:
                    try:
                        box_chart = chart_generator.create_box_plot(df, list(numeric_columns[:3]))
                        if box_chart:
                            charts.append({
                                'title': 'Box Plot of Numeric Columns',
                                'chart': box_chart,
                                'type': 'box'
                            })
                    except Exception as e:
                        logger.error(f"Error creating box plot: {e}")
            
            # Bar chart for categorical data
            if len(categorical_columns) > 0:
                try:
                    cat_col = categorical_columns[0]
                    value_counts = df[cat_col].value_counts().head(10)
                    bar_chart = chart_generator.create_bar_chart(
                        value_counts.index.tolist(),
                        value_counts.values.tolist(),
                        cat_col,
                        'Count'
                    )
                    if bar_chart:
                        charts.append({
                            'title': f'Distribution of {cat_col}',
                            'chart': bar_chart,
                            'type': 'bar'
                        })
                except Exception as e:
                    logger.error(f"Error creating bar chart: {e}")
            
            # Scatter plot if we have at least 2 numeric columns
            if len(numeric_columns) >= 2:
                try:
                    scatter_chart = chart_generator.create_scatter_plot(
                        df, numeric_columns[0], numeric_columns[1]
                    )
                    if scatter_chart:
                        charts.append({
                            'title': f'{numeric_columns[0]} vs {numeric_columns[1]}',
                            'chart': scatter_chart,
                            'type': 'scatter'
                        })
                except Exception as e:
                    logger.error(f"Error creating scatter plot: {e}")
        else:
            logger.warning("Chart generator not available - no charts will be created")
        
        return render_template('dashboard.html', 
                             stats=stats,
                             charts=charts,
                             columns=list(df.columns),
                             filename=session.get('original_filename', 'Unknown'))
        
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        flash('Error generating dashboard. Please try again.', 'error')
        return redirect(url_for('preview'))

@app.route('/generate_chart', methods=['POST'])
def generate_chart():
    """Generate custom chart based on user selection"""
    if 'current_file' not in session:
        return jsonify({'error': 'No file uploaded'}), 400
    
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        df = data_processor.load_data(file_path)
        
        if df is None:
            return jsonify({'error': 'Error loading data'}), 400
        
        json_data = request.get_json()
        if not json_data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        chart_type = json_data.get('chart_type')
        x_column = json_data.get('x_column')
        y_column = json_data.get('y_column')
        title = json_data.get('title', f'{chart_type.title()} Chart' if chart_type else 'Chart')
        
        chart_html = None
        
        if chart_type == 'bar':
            if x_column in df.columns:
                if y_column and y_column in df.columns:
                    # Grouped data
                    grouped = df.groupby(x_column)[y_column].sum()
                    chart_html = chart_generator.create_bar_chart(
                        grouped.index.tolist(), grouped.values.tolist(), x_column, y_column
                    )
                else:
                    # Value counts
                    value_counts = df[x_column].value_counts().head(20)
                    chart_html = chart_generator.create_bar_chart(
                        value_counts.index.tolist(), value_counts.values.tolist(), x_column, 'Count'
                    )
        
        elif chart_type == 'line':
            if x_column in df.columns and y_column in df.columns:
                chart_html = chart_generator.create_line_chart(df, x_column, y_column)
        
        elif chart_type == 'scatter':
            if x_column in df.columns and y_column in df.columns:
                chart_html = chart_generator.create_scatter_plot(df, x_column, y_column)
        
        elif chart_type == 'histogram':
            if x_column in df.columns:
                chart_html = chart_generator.create_histogram(df, x_column)
        
        elif chart_type == 'box':
            columns = [x_column] if x_column in df.columns else []
            if y_column and y_column in df.columns:
                columns.append(y_column)
            if columns:
                chart_html = chart_generator.create_box_plot(df, columns)
        
        elif chart_type == 'pie':
            if x_column in df.columns:
                value_counts = df[x_column].value_counts().head(10)
                chart_html = chart_generator.create_pie_chart(
                    value_counts.index.tolist(), value_counts.values.tolist()
                )
        
        if chart_html:
            return jsonify({'chart': chart_html, 'title': title})
        else:
            return jsonify({'error': 'Could not generate chart with selected parameters'}), 400
        
    except Exception as e:
        logger.error(f"Chart generation error: {str(e)}")
        return jsonify({'error': 'Error generating chart'}), 500

@app.route('/export/<format>')
def export_data(format):
    if 'current_file' not in session:
        flash('No file uploaded. Please upload a file first.', 'error')
        return redirect(url_for('upload'))
    
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        df = data_processor.load_data(file_path)
        
        if df is None:
            flash('Error loading file. Please try uploading again.', 'error')
            return redirect(url_for('upload'))
        
        # Generate export file
        export_path = export_handler.export_data(df, format, app.config['EXPORT_FOLDER'])
        
        if export_path and os.path.exists(export_path):
            return send_file(export_path, as_attachment=True)
        else:
            flash('Error exporting file. Please try again.', 'error')
            return redirect(url_for('dashboard'))
        
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        flash('Error exporting file. Please try again.', 'error')
        return redirect(url_for('dashboard'))

@app.route('/export_summary')
def export_summary():
    if 'current_file' not in session:
        flash('No file uploaded. Please upload a file first.', 'error')
        return redirect(url_for('upload'))
    
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        df = data_processor.load_data(file_path)
        
        if df is None:
            flash('Error loading file. Please try uploading again.', 'error')
            return redirect(url_for('upload'))
        
        # Generate summary report
        export_path = export_handler.export_summary_report(df, app.config['EXPORT_FOLDER'])
        
        if export_path and os.path.exists(export_path):
            return send_file(export_path, as_attachment=True)
        else:
            flash('Error generating summary report. Please try again.', 'error')
            return redirect(url_for('dashboard'))
        
    except Exception as e:
        logger.error(f"Summary export error: {str(e)}")
        flash('Error generating summary report. Please try again.', 'error')
        return redirect(url_for('dashboard'))

@app.route('/manifest.json')
def manifest():
    return send_file('static/manifest.json')

@app.route('/sw.js')
def service_worker():
    return send_file('static/sw.js')

@app.errorhandler(404)
def not_found(error):
    return render_template('offline.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('offline.html'), 500
