from flask import request, Blueprint, jsonify
from flask_restful import Resource, Api, abort
from marshmallow import ValidationError

from .. import db
from ..models import Product
from ..schemas import product_schema, products_schema


product_bp = Blueprint('products', __name__)
product_api = Api(product_bp)


class ProductList(Resource):
    def get(self):
        """
        Fetches all products.
        """
        products = Product.query.all()
        return products_schema.dump(products), 200

    def post(self):
        """
        Creates a new product.
        (Currently public, add admin check later if needed)
        """
        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400

        try:
            new_product = product_schema.load(json_data, session=db.session)
        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400

        try:
            db.session.add(new_product)
            db.session.commit()
            return product_schema.dump(new_product), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating product: {e}")
            abort(500, message="An error occurred while creating the product.")


class ProductDetail(Resource):
    def get(self, product_id):
        """
        Fetches a single product by its UUID.
        """
        product = Product.query.get_or_404(product_id, description=f"Product with ID {product_id} not found.")
        return product_schema.dump(product), 200




product_api.add_resource(ProductList, '/')
product_api.add_resource(ProductDetail, '/<string:product_id>')
