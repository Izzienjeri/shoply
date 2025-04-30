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
        Creates one OR multiple new products.
        Accepts either a single JSON object representing one product,
        or a JSON array containing multiple product objects.
        (Currently public, add admin check later if needed)
        """
        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400

        is_many = isinstance(json_data, list)

        try:
            if is_many:
                new_products = products_schema.load(json_data, session=db.session)
            else:
                new_products = [product_schema.load(json_data, session=db.session)]
        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400
        except Exception as e:
             print(f"Unexpected error during schema load: {e}")
             abort(500, message="An internal error occurred during data processing.")


        if not new_products:
             return {"message": "No valid product data found after validation."}, 400

        try:
            db.session.add_all(new_products)
            db.session.commit()

            if is_many:
                return products_schema.dump(new_products), 201
            else:
                return product_schema.dump(new_products[0]), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating product(s) in DB: {e}")
            abort(500, message="An error occurred while saving the product(s) to the database.")


class ProductDetail(Resource):
    def get(self, product_id):
        """
        Fetches a single product by its UUID.
        """
        product = Product.query.get_or_404(product_id, description=f"Product with ID {product_id} not found.")
        return product_schema.dump(product), 200

    def patch(self, product_id):
        """
        Updates an existing product partially.
        (Currently public, add admin check later if needed)
        """
        product = Product.query.get_or_404(product_id, description=f"Product with ID {product_id} not found.")

        json_data = request.get_json()
        if not json_data:
            return {"message": "No input data provided"}, 400

        try:
            updated_product = product_schema.load(
                json_data,
                instance=product,
                partial=True,
                session=db.session
            )
        except ValidationError as err:
            return {"message": "Validation errors", "errors": err.messages}, 400

        try:
            db.session.commit()
            return product_schema.dump(updated_product), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error updating product {product_id}: {e}")
            abort(500, message="An error occurred while updating the product.")

    def delete(self, product_id):
        """
        Deletes a product by its UUID.
        (Currently public, add admin check later if needed)
        """
        product = Product.query.get_or_404(product_id, description=f"Product with ID {product_id} not found.")
        try:
            db.session.delete(product)
            db.session.commit()
            return '', 204
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting product {product_id}: {e}")
            abort(500, message="An error occurred while deleting the product.")


product_api.add_resource(ProductList, '/')
product_api.add_resource(ProductDetail, '/<string:product_id>')