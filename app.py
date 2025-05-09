from flask import Flask, render_template, send_from_directory

app = Flask(__name__, template_folder='pages')

# Routes for static files
@app.route('/scripts/<path:filename>')
def serve_scripts(filename):
    return send_from_directory('scripts', filename)

@app.route('/styles/<path:filename>')
def serve_styles(filename):
    return send_from_directory('styles', filename)

@app.route('/')
def index():
    return render_template('index.html', title='Home')

@app.route('/leaderboard.html')
def leaderboard():
    return render_template('leaderboard.html', title='Leaderboard')

if __name__ == '__main__':
    app.run(debug=True)
