from flask import request, Blueprint, current_app
from flask_restful import Resource, Api, abort
from sqlalchemy import or_, func, desc, case
from sqlalchemy.orm import joinedload

from .. import db
from ..models import Artwork, Artist
from ..schemas import artworks_schema, artists_schema

search_bp = Blueprint('search', __name__)
search_api = Api(search_bp)

class GlobalSearch(Resource):
    def get(self):
        query_param = request.args.get('q', '').strip()
        context = request.args.get('context', None) 
        
        if not query_param:
            return {"message": "Search query cannot be empty."}, 400
        if len(query_param) < 2: 
            return {"message": "Search query must be at least 2 characters long."}, 400

        search_term = f"%{query_param}%"
        
        artwork_relevance_score = case(
            (Artwork.name.ilike(search_term), 3),
            (Artist.name.ilike(search_term), 2),
            (Artwork.description.ilike(search_term), 1),
            else_=0
        ).label("artwork_relevance")

        artworks_results_query = Artwork.query.options(joinedload(Artwork.artist))\
            .join(Artist, Artwork.artist_id == Artist.id)\
            .filter(
                Artwork.is_active == True,
                Artist.is_active == True,
                or_(
                    Artwork.name.ilike(search_term),
                    Artwork.description.ilike(search_term),
                    Artist.name.ilike(search_term)
                )
            )
        
        if context == 'artworks':
            artworks_results_query = artworks_results_query.order_by(
                desc(artwork_relevance_score), 
                Artwork.created_at.desc()
            )
        else:
            artworks_results_query = artworks_results_query.order_by(
                desc(artwork_relevance_score),
                Artwork.created_at.desc()
            )
        artworks_results = artworks_results_query.limit(20).all() 

        artist_relevance_score = case(
            (Artist.name.ilike(search_term), 2),
            (Artist.bio.ilike(search_term), 1),
            else_=0
        ).label("artist_relevance")

        artists_results_query = Artist.query.filter(
            Artist.is_active == True,
            or_(
                Artist.name.ilike(search_term),
                Artist.bio.ilike(search_term)
            )
        )
        if context == 'artists':
            artists_results_query = artists_results_query.order_by(
                desc(artist_relevance_score),
                Artist.name.asc() 
            )
        else:
             artists_results_query = artists_results_query.order_by(
                desc(artist_relevance_score),
                Artist.name.asc()
            )
        artists_results = artists_results_query.limit(10).all()
        

        current_app.logger.info(f"Search for '{query_param}' (context: {context}): Found {len(artworks_results)} artworks, {len(artists_results)} artists.")

        return {
            "artworks": artworks_schema.dump(artworks_results),
            "artists": artists_schema.dump(artists_results),
            "query": query_param
        }, 200

search_api.add_resource(GlobalSearch, '/')